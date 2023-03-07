import { Writer } from './encode-writer.mjs';
import { getType } from './encode-get-type.mjs';
import { findNumArrayBestEncoding, getNumericType, writeNumber, writeNumbers, writeNumericArray, writeNumericArrayHeader } from './encode-number.mjs';
import { writeStrings } from './encode-string.mjs';
import { collectArrayObjectInfo } from './encode-object.mjs';
import {
    TYPE_NULL,
    TYPE_STRING,
    TYPE_NUMBER,
    TYPE_OBJECT,
    TYPE_ARRAY,

    // TYPE_NAME,

    PACK_TYPE,
    UNPACK_TYPE
} from './const.mjs';
import { resetStat } from './debug-stat.mjs';

const EMPTY_MAP = new Map();

export function encode(input, options = {}) {
    function writeString(str) {
        let ref = strings.get(str);

        if (ref === undefined) {
            ref = stringIdx++;
            strings.set(str, ref);
        }

        stringRefs.push(ref);
    }

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

                if (entryValue === undefined) {
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
                const entryType = packedType(entryValue);
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
                    writer.writeUint8(entryType << 1);
                    writeString(key);

                    objectEntryDefs[entryIdx].set(defId, (objectEntryDefs[entryIdx].size << 1) | 1);
                }

                writePackedTypeValue(entryType, object[key]);
                entryIdx++;
            }
        }

        writer.writeUint8(0);
    }

    function writeArray(array, knownLength = false, column = null, headerRefs = true) {
        // an empty array
        if (array.length === 0) {
            writer.writeUint8(0);
            return;
        }

        // collect array element types
        let elemTypes = null;
        let typeBitmap = 0;
        let typeCount = 0;
        let numericEncoding = 0;
        let numbers = null;

        if (column !== null) {
            elemTypes = column.types;
            typeBitmap = column.typeBitmap;
            typeCount = column.typeCount;
        } else {
            for (let i = 0; i < array.length; i++) {
                const elem = array[i];
                const elemType = elem === undefined
                    ? TYPE_NULL
                    : getType(elem);

                if ((typeBitmap & elemType) === 0) {
                    if (typeCount === 1) {
                        elemTypes = new Uint8Array(array.length).fill(typeBitmap, 0, i);
                    }

                    typeCount++;
                    typeBitmap |= elemType;
                }

                if (elemTypes !== null) {
                    elemTypes[i] = elemType;
                }
            }
        }

        // try to optimize array of uint values only
        if (typeBitmap & TYPE_NUMBER) {
            numbers = typeBitmap === TYPE_NUMBER
                ? array
                : array.filter((_, idx) => elemTypes[idx] === TYPE_NUMBER);

            numericEncoding = findNumArrayBestEncoding(writer, numbers);
        }

        // collect info for objects
        const {
            hasInlinedEntries: hasObjectInlinedEntries,
            columns: objectColumns
        } = collectArrayObjectInfo(array, elemTypes, typeBitmap);

        // array header
        // =====================
        //
        // 1st byte:
        //
        //   7 6 5 4 3 2 1 0
        //   ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬
        //   │ │ │ │ │ │ │ └ 0 - definition, 1 - defenition reference
        //   │ │ │ │ │ │ └ has inlined objects
        //   │ │ │ │ │ └ undefined (holes)
        //   │ │ │ │ └ null
        //   │ │ │ └ number
        //   │ │ └ string
        //   │ └ has object columns
        //   └ true
        //
        // 2nd byte (optional, carry bit = 1):
        //
        //   x x 3 2 1 09 8
        //   ┬ ┬ ┬ ┬ ┬ ┬─ ┬
        //   │ │ │ │ │ │  └ false
        //   │ │ │ │ │ └ array: 00 - no, 01 - as is, 11 - flatten, 10 - ?
        //   │ │ │ │ └ (reserved)
        //   │ │ │ └ (reserved)
        //   │ │ └ (reserved)
        //   │ └ (carry bit)
        //   └ (carry bit)
        //
        // ...numericEncoding bytes (optional, number = 1)
        //

        const hasObjectColumnKeys = objectColumns.size !== 0;
        const hasFlattenArrays = 0;
        // typeBitmap & TYPE_ARRAY
        //     ? ((typeCount === 1) || getTypeCount(elemTypes, TYPE_ARRAY) > 1) &&
        //         // don't flatten arrays of object arrays for now
        //         array.every(elem => !Array.isArray(elem) || elem.every(elem2 => getType(elem2) !== TYPE_OBJECT))
        //     : 0;
        const arrayTypeBytes =
            (hasFlattenArrays << 10) |
            (hasObjectColumnKeys << 6) |         // PACK_TYPE[TYPE_OBJECT] + 2
            ((typeBitmap & ~TYPE_OBJECT) << 2) | // disable object type bit
            (hasObjectInlinedEntries << 1);

        // console.log(arrayTypeBytes.toString(2), {hasObjectColumnKeys,hasObjectInlinedEntries}, array);

        const arrayDef = (numericEncoding << 16) | arrayTypeBytes;
        const arrayDefId = headerRefs ? arrayDefs.get(arrayDef) : undefined;

        if (!knownLength) {
            writer.writeVlq(array.length);
        }

        if (arrayDefId !== undefined) {
            writer.writeVlq(arrayDefId);
        } else {
            if (headerRefs) {
                arrayDefs.set(arrayDef, (arrayDefs.size << 1) | 1);
            }

            writer.writeVlq(arrayTypeBytes);

            writeNumericArrayHeader(writer, numericEncoding);
        }

        // console.log('array', array, 'header', writer.written - written, 'enc', encoding);

        // write type index when there is more than a single type
        if (typeCount > 1) {
            writer.writeTypeIndex(elemTypes, typeBitmap, true);
        }

        // write strings
        if (typeBitmap & TYPE_STRING) {
            for (let i = 0; i < array.length; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_STRING) {
                    writeString(array[i]);
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

            writeNumericArray(writer, arrays.map(array => array.length));
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
                writeString(key);
            }

            // values
            for (const column of objectColumns.values()) {
                writeArray(column.values, true, column);
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
            case TYPE_STRING: writeString(value); break;
            case TYPE_NUMBER: writeNumber(writer, value, packedType >> 3); break;
            case TYPE_OBJECT: writeObject(value); break;
            case TYPE_ARRAY:  writeArray(value); break;
        }
    }

    const writer = new Writer(options.chunkSize);
    const objectKeys = new Map();
    const objectEntryDefs = [];
    const arrayDefs = new Map();
    const strings = new Map();
    const stringRefs = [];
    let stringIdx = 0;
    const inputType = packedType(input);

    resetStat();

    writer.writeUint8(inputType);
    writePackedTypeValue(inputType, input);

    const structureBytes = writer.value;
    const stringBytes = writeStrings([...strings.keys()], stringRefs, writer, writeArray);

    return Buffer.concat([
        stringBytes,
        structureBytes
    ]);
}
