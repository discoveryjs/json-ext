import {
    MAX_UINT_28,
    MAX_UINT_32,

    TYPE_TRUE,
    TYPE_FALSE,
    TYPE_STRING,
    TYPE_UINT_8,
    TYPE_UINT_16,
    TYPE_UINT_24,
    TYPE_UINT_32,
    TYPE_UINT_32_VAR,
    TYPE_NEG_INT,
    TYPE_FLOAT_32,
    TYPE_FLOAT_64,
    TYPE_OBJECT,
    TYPE_ARRAY,
    TYPE_NULL,
    TYPE_UNDEF,

    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_VLQ2,
    ARRAY_ENCODING_PROGRESSION,
    ARRAY_ENCODING_STRING,
    ARRAY_ENCODING_STRING_DEFAULT,

    LOW_BITS_TYPE,
    LOW_BITS_FLAGS
} from './const.mjs';

// reusable dictionary of used types for a value seria index
const typeIndexDictionary = new Uint8Array(32);

export function decode(bytes) {
    function readVlq() {
        let num = view.getUint8(pos);

        if ((num & 0x01) === 0) {
            num = num >> 1;
            pos += 1;
        } else if ((num & 0x02) === 0) {
            num = view.getUint16(pos, true) >> 2;
            pos += 2;
        } else if ((num & 0x04) === 0) {
            num = (view.getUint8(pos + 2) << 13) | (view.getUint16(pos, true) >> 3);
            pos += 3;
        } else {
            const low32 = view.getUint32(pos, true);

            num = (low32 >> 3) & MAX_UINT_28;
            pos += 4;

            if (low32 & 0x8000_0000) {
                num += readVarNum() * (1 << 29);
            }
        }

        return num;
    }

    function readVarNum() {
        let base = 0x80;
        let byte = view.getUint8(pos++);
        let value = byte & 0x7f;

        while (byte & 0x80) {
            byte = view.getUint8(pos++);
            value += (byte & 0x7f) * base;
            base *= 0x80;
        }

        return value;
    }

    function readSignedVarNum() {
        const value = readVarNum();
        const num = value <= MAX_UINT_32
            ? value >> 1
            : value / 2;

        return value & 1 ? -num : num;
    }

    function readType() {
        const type = view.getUint8(pos);
        pos += 1;
        return type;
    }

    function readString() {
        const num = readVlq();
        const isReference = num & 1;

        if (isReference) {
            // reference
            return strings[num >> 1];
        }

        // definition
        const prevStringLen = num === 0 ? readVlq() : 0;
        const len = num === 0 ? readVlq() : num >> 1;
        let str = readStringBytes(len);

        if (num === 0) {
            str = prevString.slice(0, prevStringLen) + str;
        }

        strings.push(str);
        prevString = str;

        return str;
    }

    function readStringBytes(len) {
        const str = stringDecoder.decode(bytes.subarray(pos, pos + len));
        pos += len;

        return str;
    }

    function readObject(object = {}) {
        let entryIdx = 0;

        while (true) {
            const type = readVlq();

            // zero reference is end of the list
            if (type === 0) {
                break;
            }

            if (entryIdx >= objectEntryDefs.length) {
                objectEntryDefs[entryIdx] = [];
            }

            if (type & 1) {
                // reference
                const [key, entryType] = objectEntryDefs[entryIdx][type >> 1];
                object[key] = readValue(entryType);
            } else {
                // definition
                const key = readString();
                const entryType = readType();

                objectEntryDefs[entryIdx].push([key, entryType]);
                object[key] = readValue(entryType);
            }

            entryIdx++;
        }

        return object;
    }

    function readArray(knownLength) {
        const arrayLength = typeof knownLength === 'number' ? knownLength : readVlq();

        if (arrayLength === 0) {
            return [];
        }

        const prelude = readVlq();
        const isReference = (prelude & 1) === 1;

        const header = isReference
            ? arrayHeaders[prelude >> 1]
            : view.getUint8(pos++);
        const encoding = isReference
            ? (header >> 24)
            : (prelude >> 1) & 0x3f;
        let typeBits = isReference
            ? (header >> 8) & 0xffff
            : 0;

        if (!isReference) {
            const extraTypes = (header >> 5) & 0b11;

            switch (extraTypes) {
                case 0b01: {
                    const extraTypesList = view.getUint8(pos++);
                    typeBits = (1 << (extraTypesList & 0x0f)) | (1 << (extraTypesList >> 4));
                    break;
                }

                case 0b10: {
                    typeBits = view.getUint8(pos++);
                    break;
                }

                case 0b11: {
                    typeBits = view.getUint16(pos, true);
                    pos += 2;
                    break;
                }
            }

            arrayHeaders.push((encoding << 24) | (typeBits << 8) | header);
        }

        const result = new Array(arrayLength);
        const hasUndef = (header >> 7) & 1;                  // a
        const lowBitsKind = (header >> 4) & 1;               // c
        const lowBits = header & 0x0f;                       // dddd
        const lowBitsFlags = lowBitsKind === LOW_BITS_FLAGS
            ? lowBits
            : 0x00;
        const lowBitsType = lowBitsKind === LOW_BITS_TYPE
            ? lowBits
            : 0x00;
        const hasObjectColumnKeys = (lowBitsFlags >> 3) & 1; // e
        const hasObjectInlineKeys = (lowBitsFlags >> 2) & 1; // f
        const hasFlattenArrays = (lowBitsFlags >> 1) & 1;       // g
        const hasNulls = (lowBitsFlags >> 0) & 1;            // h
        let typeBitmap =
            (typeBits) |
            (lowBitsKind === LOW_BITS_TYPE ? 1 << lowBitsType : 0) |
            (hasUndef << TYPE_UNDEF) |
            (hasNulls << TYPE_NULL) |
            (hasFlattenArrays << TYPE_ARRAY) |
            ((hasObjectColumnKeys || hasObjectInlineKeys) << TYPE_OBJECT);

        // console.log(arrayLength,
        //     'header:', header.toString(2).padStart(8, 0),
        //     'typeBitmap:', typeBitmap.toString(2).padStart(8, 0),
        //     { specialEncoding, extraTypes, hasObjectColumnKeys, hasObjectInlineKeys }
        // );

        switch (encoding) {
            case ARRAY_ENCODING_VLQ: {
                for (let i = 0; i < arrayLength; i++) {
                    result[i] = readVarNum();
                }
                break;
            }

            case ARRAY_ENCODING_VLQ2: {
                let indexPos = pos;

                pos += Math.ceil(arrayLength / 2);

                for (let i = 0, indexByte = 0; i < arrayLength; i++) {
                    if ((i & 1) === 0) {
                        indexByte = view.getUint8(indexPos++);
                    }

                    const n = indexByte & 0x0f;

                    if (n <= 0x07) {
                        result[i] = n;
                    } else {
                        result[i] = readVarNum() * 8 + (n & 0x07);
                    }

                    indexByte = indexByte >> 4;
                }
                break;
            }

            case ARRAY_ENCODING_PROGRESSION: {
                result[0] = readVarNum();
                const step = readSignedVarNum();

                for (let i = 1; i < arrayLength; i++) {
                    result[i] = result[i - 1] + step;
                }

                break;
            }

            case ARRAY_ENCODING_STRING: {
                const stringHeaders = readArray();

                for (let i = 0, k = 0; i < arrayLength; i++) {
                    const header = stringHeaders[k++];

                    if (header & 1) {
                        result[i] = strings[header >> 1];
                    } else {
                        const str = header & 0b10
                            // slice
                            ? prevString.slice(0, stringHeaders[k++]) + readStringBytes(header >> 2)
                            // raw
                            : readStringBytes(header >> 2);

                        strings.push(str);
                        prevString = str;
                        result[i] = str;
                    }
                }
                break;
            }

            case ARRAY_ENCODING_STRING_DEFAULT:
            default: {
                const hasObjects = typeBitmap & (1 << TYPE_OBJECT);
                const hasArrays = typeBitmap & (1 << TYPE_ARRAY);
                let typeCount = 0;
                let typeIdx = 0;
                while (typeBitmap > 0) {
                    if (typeBitmap & 1) {
                        typeIndexDictionary[typeCount++] = typeIdx;
                    }

                    typeIdx++;
                    typeBitmap >>= 1;
                }

                let objects = typeCount > 1 && hasObjects ? [] : null;
                let arrays = typeCount > 1 && hasArrays ? [] : null;

                if (typeCount > 1) {
                    const bitsPerType = 32 - Math.clz32(typeCount - 1);
                    const mask = (1 << bitsPerType) - 1;
                    const typeMapping = hasObjects || hasArrays
                        ? typeIndexDictionary.slice(0, typeCount)
                        : typeIndexDictionary;
                    let indexPos = pos;
                    let left = 0;
                    let byte = 0;

                    pos += Math.ceil(bitsPerType * arrayLength / 8);

                    for (let i = 0; i < arrayLength; i++) {
                        if (left < bitsPerType) {
                            byte |= view.getUint8(indexPos) << left;
                            left += 8;
                            indexPos++;
                        }

                        const elemType = typeMapping[byte & mask];

                        if (elemType !== TYPE_OBJECT) {
                            if (elemType === TYPE_ARRAY && hasFlattenArrays) {
                                arrays.push(i);
                            } else {
                                result[i] = readValue(elemType);
                            }
                        } else {
                            objects.push(result[i] = {});
                        }

                        byte >>= bitsPerType;
                        left -= bitsPerType;
                    }
                } else {
                    const elemType = typeIndexDictionary[0];

                    if (elemType === TYPE_OBJECT) {
                        objects = result;
                        for (let i = 0; i < arrayLength; i++) {
                            objects[i] = {};
                        }
                    } else if (hasFlattenArrays) {
                        arrays = Array.from({ length: arrayLength }, (_, idx) => idx);
                    } else {
                        for (let i = 0; i < arrayLength; i++) {
                            result[i] = readValue(elemType);
                        }
                    }
                }

                if (hasFlattenArrays) {
                    const arraysLength = readArray(arrays.length);
                    const values = readArray();

                    for (let i = 0, offset = 0; i < arrays.length; i++) {
                        result[arrays[i]] = values.slice(offset, offset += arraysLength[i]);
                    }
                }

                if (hasObjectColumnKeys) {
                    const keysLength = readVlq();
                    const keys = new Array(keysLength);

                    // read keys
                    for (let i = 0; i < keysLength; i++) {
                        keys[i] = readString();
                    }

                    // read column values
                    for (let i = 0; i < keysLength; i++) {
                        const key = keys[i];
                        const vals = readArray(objects.length);

                        for (let j = 0; j < objects.length; j++) {
                            if (vals[j] !== undefined) {
                                objects[j][key] = vals[j];
                            }
                        }
                    }
                }

                if (hasObjectInlineKeys) {
                    for (const object of objects) {
                        readObject(object);
                    }
                }
            }
        }

        return result;
    }

    function readValue(type) {
        switch (type) {
            case TYPE_NULL:
                return null;

            case TYPE_TRUE:
                return true;

            case TYPE_FALSE:
                return false;

            case TYPE_UNDEF:
                return undefined;

            case TYPE_STRING:
                return readString();

            case TYPE_UINT_8: {
                const value = view.getUint8(pos);
                pos += 1;
                return value;
            }

            case TYPE_UINT_16: {
                const value = view.getUint16(pos, true);
                pos += 2;
                return value;
            }

            case TYPE_UINT_24: {
                const value = view.getUint16(pos, true) + (view.getUint8(pos + 2) << 16);
                pos += 3;
                return value;
            }

            case TYPE_UINT_32: {
                const value = view.getUint32(pos, true);
                pos += 4;
                return value;
            }

            case TYPE_UINT_32_VAR: {
                return readVarNum();
            }

            case TYPE_NEG_INT: {
                return -readVarNum();
            }

            case TYPE_FLOAT_32: {
                const value = view.getFloat32(pos);
                pos += 4;
                return value;
            }

            case TYPE_FLOAT_64: {
                const value = view.getFloat64(pos);
                pos += 8;
                return value;
            }

            case TYPE_OBJECT:
                return readObject();

            case TYPE_ARRAY:
                return readArray();
        }
    }

    const stringDecoder = new TextDecoder('utf8', { ignoreBOM: true });
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const objectEntryDefs = [];
    const arrayHeaders = [];
    const strings = [''];
    let prevString = '';
    let pos = 0;

    const ret = readValue(readType());

    return ret;
}
