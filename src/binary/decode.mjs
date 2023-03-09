import { Reader } from './decode-reader.mjs';
import { getTypeCount } from './encode-get-type.mjs';
import { readNumber, readNumbers, readNumericArray, readNumericArrayEncoding } from './decode-number.mjs';
import {
    TYPE_UNDEF,
    TYPE_NULL,
    TYPE_NUMBER,
    TYPE_STRING,
    TYPE_OBJECT,
    TYPE_TRUE,
    TYPE_FALSE,
    TYPE_ARRAY,

    BIT_COUNT,
    UNPACK_TYPE,
    VALUE_CONTAINING_TYPE
} from './const.mjs';

const stringDecoder = new TextDecoder('utf8', { ignoreBOM: true });

function loadStrings(reader) {
    const allStrings = stringDecoder.decode(reader.readBytes(reader.readVlq()));
    const defs = readNumericArray(reader);
    const slices = readNumericArray(reader);
    const stringRefs = readNumericArray(reader);
    const strings = new Array(defs);

    for (let i = 0, offset = 0, sliceIdx = 0, prevString = ''; i < defs.length; i++) {
        const def = defs[i];
        let str = allStrings.slice(offset, offset += def >> 2);

        if (def & 0b10) {
            str = prevString.slice(0, slices[sliceIdx++]) + str;
        }

        if (def & 0b01) {
            str = str + prevString.slice(-slices[sliceIdx++]);
        }

        strings[i] = str;
        prevString = str;
    }

    return { stringRefs, strings };
}

export function decode(bytes) {
    function readString() {
        return strings[stringRefs[stringRefIdx++]];
    }

    function readObject(object = {}) {
        let entryIdx = 0;

        while (true) {
            const firstByte = reader.readUint8();

            // zero byte is the end of the entry list
            if (firstByte === 0) {
                break;
            }

            if (firstByte & 1) {
                // reference
                const defId = (firstByte & 0x80 ? reader.readUintVar() << 6 : 0) | ((firstByte >> 1) & 0x3f);
                const { key, entryType } = objectEntryDefs[entryIdx][defId];

                object[key] = readPackedTypeValue(entryType);
            } else {
                // definition
                const key = readString();
                const entryType = firstByte >> 1;
                const def = { key, entryType };

                if (entryIdx >= objectEntryDefs.length) {
                    objectEntryDefs[entryIdx] = [def];
                } else {
                    objectEntryDefs[entryIdx].push(def);
                }

                object[key] = readPackedTypeValue(entryType);
            }

            entryIdx++;
        }

        return object;
    }

    function readArray(arrayLength = reader.readVlq()) {
        if (arrayLength === 0) {
            return [];
        }

        const prelude = reader.readVlq();
        const isReference = prelude & 1;

        const header = isReference
            ? arrayHeaders[prelude >> 1]
            : prelude >> 1;
        const numericEncoding = isReference
            ? header >> 16
            : readNumericArrayEncoding(reader);

        if (!isReference) {
            arrayHeaders.push((numericEncoding << 16) | header);
        }

        const hasObjectInlineKeys = header & 1;
        const hasObjectColumnKeys = (header >> 5) & 1;
        const hasFlattenArrays = (header >> 9) & 1;
        const typeBitmap = ((header >> 1) & 0xff) | ((header & 1) << 4);

        // console.log('readArray len:', arrayLength, isReference ? '(ref)' : '(def)',
        //     'header:', header.toString(2).padStart(8, 0),
        //     'typeBitmap:', typeBitmap.toString(2).padStart(8, 0),
        //     'numericEncoding:', numericEncoding.toString(2).padStart(8, 0),
        //     { hasObjectColumnKeys, hasObjectInlineKeys }
        // );

        const array = new Array(arrayLength);
        const elemTypes = BIT_COUNT[typeBitmap] > 1
            ? reader.readTypeIndex(arrayLength, typeBitmap, true)
            : null;

        if (typeBitmap & VALUE_CONTAINING_TYPE) {
            if (elemTypes === null) {
                array.fill(readValue(typeBitmap));
            } else {
                for (let i = 0; i < arrayLength; i++) {
                    if (elemTypes[i] & VALUE_CONTAINING_TYPE) {
                        array[i] = readValue(elemTypes[i]);
                    }
                }
            }
        }

        // read strings
        if (typeBitmap & TYPE_STRING) {
            for (let i = 0; i < arrayLength; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_STRING) {
                    array[i] = readString();
                }
            }
        }

        // read numbers
        if (typeBitmap & TYPE_NUMBER) {
            if (typeBitmap === TYPE_NUMBER) {
                readNumbers(reader, numericEncoding, arrayLength, array);
            } else {
                const numberCount = getTypeCount(elemTypes, TYPE_NUMBER);
                const numbers = readNumbers(reader, numericEncoding, numberCount);

                for (let i = 0, k = 0; i < arrayLength; i++) {
                    if (elemTypes[i] === TYPE_NUMBER) {
                        array[i] = numbers[k++];
                    }
                }
            }
        }

        // read arrays
        if (typeBitmap & TYPE_ARRAY) {
            if (hasFlattenArrays) {
                const arrayCount = typeBitmap === TYPE_ARRAY
                    ? arrayLength
                    : getTypeCount(elemTypes, TYPE_ARRAY);
                const arraysLength = readNumericArray(reader, arrayCount);
                const values = readArray();

                for (let i = 0, offset = 0; i < arrayLength; i++) {
                    if (elemTypes === null || elemTypes[i] === TYPE_ARRAY) {
                        array[i] = values.slice(offset, offset += arraysLength[i]);
                    }
                }
            } else {
                for (let i = 0; i < arrayLength; i++) {
                    if (elemTypes === null || elemTypes[i] === TYPE_ARRAY) {
                        array[i] = readArray();
                    }
                }
            }
        }

        // read objects
        if (typeBitmap & TYPE_OBJECT) {
            // pre-init objects
            const objects = typeBitmap === TYPE_OBJECT ? array : [];

            for (let i = 0, k = 0; i < arrayLength; i++) {
                if (elemTypes === null || elemTypes[i] === TYPE_OBJECT) {
                    array[i] = objects[k++] = {};
                }
            }

            // read object columns
            if (hasObjectColumnKeys) {
                const keysLength = reader.readVlq();
                const keys = new Array(keysLength);

                // read column names
                for (let i = 0; i < keysLength; i++) {
                    keys[i] = readString();
                }

                // read column values
                for (let i = 0; i < keysLength; i++) {
                    const key = keys[i];
                    const values = readArray(objects.length);

                    for (let j = 0; j < objects.length; j++) {
                        if (values[j] !== undefined) {
                            objects[j][key] = values[j];
                        }
                    }
                }
            }

            // read object inlined keys
            if (hasObjectInlineKeys) {
                for (let i = 0; i < objects.length; i++) {
                    readObject(objects[i]);
                }
            }
        }

        return array;
    }

    function readValue(type) {
        switch (type) {
            default:
                return undefined;

            case TYPE_NULL:
                return null;

            case TYPE_STRING:
                return readString();

            case TYPE_TRUE:
                return true;

            case TYPE_FALSE:
                return false;
        }
    }

    function readPackedTypeValue(packedType) {
        switch (UNPACK_TYPE[packedType & 0x07]) {
            case TYPE_UNDEF:
                return undefined;

            case TYPE_NULL:
                return null;

            case TYPE_STRING:
                return readString();

            case TYPE_NUMBER:
                return readNumber(reader, packedType >> 3);

            case TYPE_OBJECT:
                return readObject();

            case TYPE_TRUE:
                return true;

            case TYPE_FALSE:
                return false;

            case TYPE_ARRAY:
                return readArray();
        }
    }

    const reader = new Reader(bytes);
    const objectEntryDefs = [];
    const arrayHeaders = [];
    const { strings, stringRefs } = loadStrings(reader, readNumericArray);
    let stringRefIdx = 0;

    const ret = readPackedTypeValue(reader.readUint8());

    if (reader.pos !== bytes.byteLength) {
        throw new Error('End of input not reached');
    }

    return ret;
}
