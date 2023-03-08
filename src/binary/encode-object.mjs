import { getType, getTypeCount } from './encode-get-type.mjs';
import {
    TYPE_UNDEF,
    TYPE_OBJECT,
    BIT_COUNT
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
                            typeBitmap: 0,
                            types: new Uint8Array(objectCount),
                            values: new Array(objectCount),
                            valueCount: 0
                        });
                    }

                    column.typeBitmap |= valueType;
                    column.types[objIdx] = valueType;
                    column.values[objIdx] = value;
                    column.valueCount++;
                }

                objIdx++;
            }
        }

        // exclude keys for which the column representation is not byte efficient
        for (const column of columns.values()) {
            // Populate type bitmap with undefined type when holes
            if (column.valueCount !== objectCount) {
                column.typeBitmap |= TYPE_UNDEF;
            }

            // Count value types
            const typeCount = BIT_COUNT[column.typeBitmap];

            // When a column has values of a single type it means no holes as well as no type index
            // and column representation will always be optimal than inlined entries
            if (typeCount === 1) {
                column.types = null;
                continue;
            }

            // Estimate column values type index size
            const bitsPerType = 32 - Math.clz32(typeCount - 1);
            const typeIndexSize = Math.ceil((bitsPerType * objectCount) / 8);

            // A column overhead is a sum of a key name definition size, type index size
            // and an array header size for array of column values
            const columnOverhead =
                1 + // Min key reprentation size (a 1-byte string reference)
                1 + // Min array header size (a 1-byte array reference)
                typeIndexSize;

            // Inline entries takes at least 1 byte per entry to define a key
            // plus 1 shared byte per object to end a list of entries.
            // The shared (finishing) byte is taking into account until first column drop
            const inlineEntriesOverhead = column.valueCount * (1 + !hasInlinedEntries);

            // Drop column representation when it gives more overhead than inlined entries
            if (columnOverhead > inlineEntriesOverhead) {
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
