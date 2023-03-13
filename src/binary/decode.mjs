import { Reader } from './decode-reader.mjs';
import { getTypeCount } from './encode-get-type.mjs';
import { readNumber, readNumbers, readNumericArray } from './decode-number.mjs';
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
    let readStringIdx = 0;

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

    return {
        readStrings(start, end) {
            return stringRefs.slice(start, end).map(idx => strings[idx]);
        },
        readString() {
            return strings[stringRefs[readStringIdx++]];
        }
    };
}

function loadArrayDefs(reader) {
    const arrayHeaders = readNumericArray(reader);
    const arrayHeaderRefs = readNumericArray(reader);
    let arrayDefRefIdx = 0;

    return function readArrayHeader() {
        return arrayHeaders[arrayHeaderRefs[arrayDefRefIdx++]];
    };
}

function loadObjectEntries(reader, readStrings) {
    const defsCount = reader.readVlq();
    const keysCount = reader.readVlq();

    if (defsCount === 0) {
        return () => null;
    }

    const keys = keysCount ? readStrings(-keysCount) : [];
    const defs = new Array(defsCount);

    for (let i = 0; i < defsCount; i++) {
        defs[i] = {
            dict: readNumericArray(reader),
            refs: readNumericArray(reader),
            index: 0
        };
    }

    return function readObjectEntry(entryIdx) {
        const def = defs[entryIdx];
        const refId = def.refs[def.index++];
        const entry = def.dict[refId];

        if (entry === 0) {
            return null;
        }

        return {
            key: keys[entry >> 8],
            type: entry & 0xff
        };
    };
}

export function decode(bytes) {
    function readObject(object = {}) {
        let entryIdx = 0;
        let entry;

        while (entry = readObjectEntry(entryIdx++)) {
            object[entry.key] = readPackedTypeValue(entry.type);
        }

        return object;
    }

    function readArray(arrayLength = reader.readVlq()) {
        if (arrayLength === 0) {
            return [];
        }

        const header = readArrayHeader();
        const headerTypes = header >> 16;
        const numericEncoding = header & 0xffff;

        const hasObjectInlineKeys = headerTypes & 1;
        const hasObjectColumnKeys = (headerTypes >> 5) & 1;
        const hasFlattenArrays = (headerTypes >> 9) & 1;
        const typeBitmap = ((headerTypes >> 1) & 0xff) | ((headerTypes & 1) << 4);

        // console.log('readArray len:', arrayLength,
        //     'header:', headerTypes.toString(2).padStart(8, 0),
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
    const { readStrings, readString } = loadStrings(reader);
    const readArrayHeader = loadArrayDefs(reader);
    const readObjectEntry = loadObjectEntries(reader, readStrings);

    const ret = readPackedTypeValue(reader.readUint8());

    if (reader.pos !== bytes.byteLength) {
        throw new Error('End of input not reached');
    }

    return ret;
}
