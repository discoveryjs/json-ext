import { getType, getTypeCount } from './encode-get-type.mjs';
import {
    TYPE_OBJECT,
    TYPE_UNDEF,
    VALUE_CONTAINING_TYPE
} from './const.mjs';

const EMPTY_MAP = new Map();

export function collectArrayObjectInfo(array, elemTypes, typeBitmap) {
    let hasInlinedObjectKeys = false;
    let objectKeyColumns = EMPTY_MAP;

    if (typeBitmap & (1 << TYPE_OBJECT)) {
        hasInlinedObjectKeys = true;

        // count objects
        const onlyObjects = typeBitmap === (1 << TYPE_OBJECT);
        let objectCount = onlyObjects
            ? array.length // when TYPE_OBJECT is a single type in an array
            : getTypeCount(elemTypes, TYPE_OBJECT);

        if (objectCount > 1) {
            hasInlinedObjectKeys = false;
            objectKeyColumns = new Map();

            // collect a condidate keys for a column representation
            for (let i = 0, objIdx = 0; i < array.length; i++) {
                if (onlyObjects || elemTypes[i] === TYPE_OBJECT) {
                    const object = array[i];

                    for (const key of Object.keys(object)) {
                        const value = object[key];

                        if (value === undefined) {
                            continue;
                        }

                        let column = objectKeyColumns.get(key);
                        const valueType = getType(value);
                        const valueTypeBit = 1 << valueType;

                        if (column === undefined) {
                            column = {
                                key,
                                values: new Array(objectCount),
                                types: new Uint8Array(objectCount).fill(TYPE_UNDEF),
                                typeBitmap: 0,
                                typeCount: 0,
                                valueCount: 0,
                                valueContainedCount: 0
                            };
                            objectKeyColumns.set(key, column);
                        }

                        if ((column.typeBitmap & valueTypeBit) === 0) {
                            column.typeBitmap |= valueTypeBit;
                            column.typeCount++;
                        }

                        column.values[objIdx] = value;
                        column.types[objIdx] = valueType;
                        column.valueCount++;

                        if (valueTypeBit & VALUE_CONTAINING_TYPE) {
                            column.valueContainedCount++;
                        }
                    }

                    objIdx++;
                }
            }

            // exclude keys for which the column representation is not byte efficient
            for (const column of objectKeyColumns.values()) {
                const hasUndef = column.valueCount !== array.length;
                const typeCount = column.typeCount + hasUndef;

                // if (column.valueCount === 1 && hasUndef) {
                //     columnMonoType++;
                //     // columnMonoTypeElements += column.types.length;
                // }

                if (typeCount > 1) {
                    const bitsPerType = 32 - Math.clz32(typeCount - 1);
                    const typeBitmapIndexSize = Math.ceil((bitsPerType * array.length) / 8);

                    const valueCount = column.valueCount - column.valueContainedCount;
                    const columnSize =
                        1 + /* min key reprentation size */
                        1 + /* min array header size */
                        typeBitmapIndexSize +
                        valueCount;
                    const rawObjectSize = column.valueCount * (1 + !hasInlinedObjectKeys) + valueCount;

                    if (columnSize <= rawObjectSize) {
                        // use column representation

                        if (hasUndef) {
                            column.typeBitmap |= 1 << TYPE_UNDEF;
                            column.typeCount++;
                        }
                    } else {
                        // drop
                        hasInlinedObjectKeys = true;
                        objectKeyColumns.delete(column.key);
                    }
                }
            }
        }
    }
    // if (objectKeyColumns.size > 0 && objectKeyColumns.has('args')) {
    //     console.log([...objectKeyColumns.keys()]);
    //     console.log(objectKeyColumns.get('cat').values)
    // }

    return {
        objectKeyColumns,
        hasInlinedObjectKeys
    };
}
