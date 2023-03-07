import { getType, getTypeCount } from './encode-get-type.mjs';
import {
    TYPE_OBJECT,
    TYPE_UNDEF
} from './const.mjs';

const EMPTY_MAP = new Map();
const INFO_NO_OBJECTS = Object.freeze({
    hasInlinedEntries: false,
    columns: EMPTY_MAP
});
const INFO_INLINED_ENTRIES_ONLY = Object.freeze({
    hasInlinedEntries: true,
    columns: EMPTY_MAP
});

export function collectArrayObjectInfo(array, elemTypes, typeBitmap) {
    if ((typeBitmap & TYPE_OBJECT) === 0) {
        return INFO_NO_OBJECTS;
    }

    // count objects number
    const onlyObjects = typeBitmap === TYPE_OBJECT;
    const objectCount = onlyObjects
        ? array.length // when TYPE_OBJECT is a single type in an array
        : getTypeCount(elemTypes, TYPE_OBJECT);

    if (objectCount > 1) {
        const columns = new Map();
        let hasInlinedEntries = false;

        // collect a condidate keys for a column representation
        for (let i = 0, objIdx = 0; i < array.length; i++) {
            if (onlyObjects || elemTypes[i] === TYPE_OBJECT) {
                const object = array[i];

                for (const key of Object.keys(object)) {
                    const value = object[key];

                    if (value === undefined) {
                        continue;
                    }

                    const valueType = getType(value);
                    let column = columns.get(key);

                    if (column === undefined) {
                        columns.set(key, column = {
                            key,
                            values: new Array(objectCount),
                            types: new Uint8Array(objectCount).fill(TYPE_UNDEF),
                            typeBitmap: 0,
                            typeCount: 0,
                            valueCount: 0
                        });
                    }

                    if ((column.typeBitmap & valueType) === 0) {
                        column.typeBitmap |= valueType;
                        column.typeCount++;
                    }

                    column.types[objIdx] = valueType;
                    column.values[objIdx] = value;
                    column.valueCount++;
                }

                objIdx++;
            }
        }

        // exclude keys for which the column representation is not byte efficient
        for (const column of columns.values()) {
            const hasUndef = column.valueCount !== objectCount;
            const typeCount = column.typeCount + hasUndef;

            // When a single type value set there is no type index bitmap and column representation
            // will always be optimal than inlined entries
            if (typeCount === 1) {
                continue;
            }

            // Estimate column values type index size
            const bitsPerType = 32 - Math.clz32(typeCount - 1);
            const typeIndexBitmapSize = Math.ceil((bitsPerType * objectCount) / 8);

            // A column overhead is a sum of a key name definition size, type index size
            // and an array header size for array of column values
            const columnOverhead =
                1 + // Min key reprentation size (a 1-byte string reference)
                1 + // Min array header size (a 1-byte array reference)
                typeIndexBitmapSize;

            // Inline entries takes at least 1 byte per entry to define a key
            // plus 1 shared byte per object to end a list of entries.
            // The shared (finishing) byte is taking into account until first column drop
            const inlineEntriesOverhead = column.valueCount * (1 + !hasInlinedEntries);

            // Use column representation when it gives less or equal overhead
            if (columnOverhead <= inlineEntriesOverhead) {
                if (hasUndef) {
                    // Populate type bitmap with undefined type
                    column.typeBitmap |= TYPE_UNDEF;
                    column.typeCount++;
                }
            } else {
                // Drop the column
                hasInlinedEntries = true;
                columns.delete(column.key);
            }
        }

        // Return columns only when there are at least one column
        if (columns.size > 0) {
            return {
                hasInlinedEntries,
                columns
            };
        }
    }

    return INFO_INLINED_ENTRIES_ONLY;
}
