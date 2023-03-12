import { Writer } from './encode-writer.mjs';
import { getType, getTypeOrNull } from './encode-get-type.mjs';
import { findNumArrayBestEncoding, getNumericType, writeNumbers, writeNumericArray } from './encode-number.mjs';
import { collectArrayObjectInfo } from './encode-object.mjs';
import {
    TYPE_NONE,
    TYPE_STRING,
    TYPE_NUMBER,
    TYPE_OBJECT,
    TYPE_ARRAY,

    // TYPE_NAME,

    PACK_TYPE,
    UNPACK_TYPE,
    BIT_COUNT,
    UINT_8
} from './const.mjs';
import { resetStat } from './debug-stat.mjs';

const EMPTY_MAP = new Map();

export function encode(input, options = {}) {
    function packedType(value) {
        const type = getType(value);

        return type === TYPE_NUMBER
            ? (getNumericType(value) << 3) | PACK_TYPE[type]
            : PACK_TYPE[type];
    }

    function writeObject(object, ignoreFields = EMPTY_MAP) {
        let entryIdx = 0;

        for (const key in object) {
            if (hasOwnProperty.call(object, key) && !ignoreFields.has(key)) {
                const entryValue = object[key];
                const entryType = packedType(entryValue);

                if (entryType === TYPE_NONE) {
                    continue;
                }

                // entryType
                //
                //   7 6543 210
                //   ┬ ───┬ ──┬
                //   │    │   └ type
                //   │    └ numericType (type = TYPE_NUMBER)
                //   └ (reserved for ref/def bit as a lowest bit)
                //
                let keyId = objectKeys.get(key);

                if (keyId === undefined) {
                    objectKeys.set(key, keyId = objectKeys.size);
                }

                if (entryIdx >= objectEntryDefs.length) {
                    objectEntryDefs[entryIdx] = new Map();
                }

                const defId = (keyId << 8) | entryType;
                const refId = objectEntryDefs[entryIdx].get(defId);

                if (refId !== undefined) {
                    // entry def reference
                    writer.writeUintVar(refId);
                } else {
                    writer.writeNumber(entryType << 1, UINT_8);
                    writer.writeString(key);

                    objectEntryDefs[entryIdx].set(defId, (objectEntryDefs[entryIdx].size << 1) | 1);
                }

                writePackedTypeValue(entryType, object[key]);
                entryIdx++;
            }
        }

        writer.writeNumber(0, UINT_8);
    }

    function writeArray(array, knownLength = false, typeBitmap = 0) {
        // an empty array
        if (array.length === 0) {
            writer.writeNumber(0, UINT_8);
            return;
        }

        // collect array element types
        let elemTypes = null;
        let numericEncoding = 0;
        let numbers = null;

        if (typeBitmap === 0) {
            for (let i = 0; i < array.length; i++) {
                typeBitmap |= getTypeOrNull(array[i]);
            }
        }

        if (BIT_COUNT[typeBitmap] > 1) {
            elemTypes = array.map(getTypeOrNull);
        }

        // try to optimize array of uint values only
        if (typeBitmap & TYPE_NUMBER) {
            numbers = typeBitmap === TYPE_NUMBER
                ? array
                : array.filter((_, idx) => elemTypes[idx] === TYPE_NUMBER);

            numericEncoding = findNumArrayBestEncoding(writer, numbers, false);
        }

        // collect info for objects
        const {
            hasInlinedEntries: hasObjectInlinedEntries,
            columns: objectColumns
        } = collectArrayObjectInfo(array, elemTypes, typeBitmap);

        const hasObjectColumnKeys = objectColumns.size !== 0;
        const hasFlattenArrays = 0;
        // typeBitmap & TYPE_ARRAY
        //     ? ((BIT_COUNT[typeBitmap] === 1) || getTypeCount(elemTypes, TYPE_ARRAY) > 1) &&
        //         // don't flatten arrays of object arrays for now
        //         // array.every(elem => !Array.isArray(elem) || elem.every(elem2 => getType(elem2) !== TYPE_OBJECT))
        //     : 0;

        if (!knownLength) {
            writer.writeVlq(array.length);
        }

        writer.writeArrayHeader(
            typeBitmap,
            numericEncoding,
            hasObjectColumnKeys,
            hasObjectInlinedEntries,
            hasFlattenArrays
        );

        // console.log('array', array, 'header', writer.written - written, 'enc', encoding);
        // written = writer.written;

        // write type index when there is more than a single type
        if (BIT_COUNT[typeBitmap] > 1) {
            writer.writeTypeIndex(elemTypes, typeBitmap, true);
        }

        // write strings
        if (typeBitmap & TYPE_STRING) {
            for (let i = 0; i < array.length; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_STRING) {
                    writer.writeString(array[i]);
                }
            }
        }

        // write numbers
        if (typeBitmap & TYPE_NUMBER) {
            writeNumbers(writer, numbers, numericEncoding);
        }

        // write arrays
        if (hasFlattenArrays) {
            const arrays = typeBitmap === TYPE_ARRAY
                ? array
                : array.filter(Array.isArray);

            writeNumericArray(writer, arrays.map(array => array.length), true);
            writeArray(arrays.flat());
        } else if (typeBitmap & TYPE_ARRAY) {
            for (let i = 0; i < array.length; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_ARRAY) {
                    writeArray(array[i]);
                }
            }
        }

        // write object columns
        if (hasObjectColumnKeys) {
            // column count
            writer.writeVlq(objectColumns.size);

            // names
            for (const key of objectColumns.keys()) {
                writer.writeString(key);
            }

            // values
            for (const column of objectColumns.values()) {
                writeArray(column.values, true, column.typeBitmap);
            }
        }

        // write object inlined keys
        if (hasObjectInlinedEntries) {
            for (let i = 0; i < array.length; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_OBJECT) {
                    writeObject(array[i], objectColumns);
                }
            }
        }
    }

    function writePackedTypeValue(packedType, value) {
        switch (UNPACK_TYPE[packedType & 0x07]) {
            case TYPE_STRING: writer.writeString(value); break;
            case TYPE_NUMBER: writer.writeNumber(value, packedType >> 3); break;
            case TYPE_OBJECT: writeObject(value); break;
            case TYPE_ARRAY:  writeArray(value); break;
        }
    }

    const writer = new Writer(options.chunkSize);
    const objectKeys = new Map();
    const objectEntryDefs = [];
    const inputType = packedType(input);

    resetStat();

    writer.writeNumber(inputType, UINT_8);
    writePackedTypeValue(inputType, input);

    return writer.emit();
}
