import {
    ARRAY_ENCODING_TYPE_INDEX,
    ARRAY_ENCODING_INT_TYPE_INDEX,
    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_INT_VLQ,
    ARRAY_ENCODING_VLQ2,
    ARRAY_ENCODING_INT_VLQ2,
    ARRAY_ENCODING_PROGRESSION,

    UINT_8,
    UINT_16,
    UINT_24,
    UINT_32,
    UINT_32_VAR,
    INT_8,
    INT_16,
    INT_24,
    INT_32,
    INT_32_VAR,
    FLOAT_32,
    FLOAT_64,
    // DECIMAL,

    INT_BITS,
    FLOAT_BITS,
    BIT_COUNT,
    ARRAY_LOWERING_DELTA,
    ARRAY_LOWERING_MIN
} from './const.mjs';

export function readNumber(reader, numericType) {
    switch (numericType) {
        case UINT_8: return reader.readUint8();
        case UINT_16: return reader.readUint16();
        case UINT_24: return reader.readUint24();
        case UINT_32: return reader.readUint32();
        case UINT_32_VAR: return reader.readUintVar();

        case INT_8: return reader.readInt8();
        case INT_16: return reader.readInt16();
        case INT_24: return reader.readInt24();
        case INT_32: return reader.readInt32();
        case INT_32_VAR: return reader.readIntVar();

        case FLOAT_32: return reader.readFloat32();
        case FLOAT_64: return reader.readFloat64();
    }
}

export function readNumericArrayEncoding(reader) {
    let encoding = reader.readUint8();
    const method = encoding & 0x0f;

    if (method === ARRAY_ENCODING_TYPE_INDEX || method === ARRAY_ENCODING_INT_TYPE_INDEX) {
        encoding |= reader.readUint8() << 8;
    }

    return encoding;
}

export function readNumericArray(reader, arrayLength = reader.readVlq()) {
    const encoding = readNumericArrayEncoding(reader);
    return readNumbers(reader, encoding, arrayLength);
}

export function readNumbers(reader, encoding, arrayLength, output = new Array(arrayLength)) {
    const method = encoding & 0x0f;
    const lowering = encoding & 0x30;
    let numberCount = arrayLength;
    let baseNum = 0;
    let start = 0;

    // console.log('read', { bitmap: (encoding >> 8).toString(2),method, lowering, arrayLength })

    switch (lowering) {
        case ARRAY_LOWERING_DELTA: {
            baseNum = output[0] = reader.readIntVar();
            numberCount--;
            start = 1;
            break;
        }

        case ARRAY_LOWERING_MIN: {
            baseNum = reader.readIntVar();
            break;
        }
    }

    switch (method) {
        case ARRAY_ENCODING_VLQ: {
            for (let i = 0; i < numberCount; i++) {
                output[start + i] = reader.readUintVar();
            }
            break;
        }

        case ARRAY_ENCODING_INT_VLQ: {
            for (let i = 0; i < numberCount; i++) {
                output[start + i] = reader.readIntVar();
            }
            break;
        }

        case ARRAY_ENCODING_VLQ2: {
            const indexBytes = reader.readBytes(Math.ceil(numberCount / 2));

            for (let i = 0, indexPos = 0, indexByte = 0; i < numberCount; i++) {
                // read a byte for even indecies, since a byte encodes 2 numbers
                if ((i & 1) === 0) {
                    indexByte = indexBytes[indexPos++];
                }

                const n = indexByte & 0x0f;

                if (n <= 0x07) {
                    output[start + i] = n;
                } else {
                    output[start + i] = reader.readUintVar() * 8 + (n & 0x07);
                }

                indexByte = indexByte >> 4;
            }
            break;
        }

        case ARRAY_ENCODING_INT_VLQ2: {
            const indexBytes = reader.readBytes(Math.ceil(numberCount / 2));

            for (let i = 0, indexPos = 0, indexByte = 0; i < numberCount; i++) {
                // read a byte for even indecies, since a byte encodes 2 numbers
                if ((i & 1) === 0) {
                    indexByte = indexBytes[indexPos++];
                }

                const n = indexByte & 0x0f;
                const sign = n & 0x04 ? -1 : 1;

                if ((n & 0x08) === 0) {
                    output[start + i] = sign * (n & 0x03);
                } else {
                    output[start + i] = sign * (reader.readUintVar() * 4 + (n & 0x03));
                }

                indexByte = indexByte >> 4;
            }

            break;
        }

        case ARRAY_ENCODING_PROGRESSION: {
            output[0] = reader.readIntVar();
            const step = reader.readIntVar();

            for (let i = 1; i < arrayLength; i++) {
                output[i] = output[i - 1] + step;
            }

            break;
        }

        case ARRAY_ENCODING_TYPE_INDEX:
        case ARRAY_ENCODING_INT_TYPE_INDEX: {
            const useInt = method === ARRAY_ENCODING_INT_TYPE_INDEX;
            const packedTypeBitmap = encoding >> 8;
            const typeBitmap = useInt
                ? (encoding & INT_BITS) |
                  (packedTypeBitmap & FLOAT_BITS)
                : packedTypeBitmap;
            const typeCount = BIT_COUNT[packedTypeBitmap];
            const types = typeCount > 1
                ? reader.readTypeIndex(numberCount, typeBitmap)
                : new Uint8Array(numberCount).fill(31 - Math.clz32(typeBitmap));

            // console.log('readNumbers at',pos - reader.corPos,{useInt},arrayLength,typeBitmap.toString(2),types);

            for (let i = 0; i < numberCount; i++) {
                output[start + i] = readNumber(reader, types[i]);
            }

            break;
        }

        default:
            throw new Error(`Unknown numeric array encoding method: ${method}`);
    }

    switch (lowering) {
        case ARRAY_LOWERING_DELTA: {
            output[0] = baseNum;
            for (let i = 1; i < arrayLength; i++) {
                output[i] += output[i - 1];
            }
            break;
        }

        case ARRAY_LOWERING_MIN: {
            for (let i = 0; i < arrayLength; i++) {
                output[i] += baseNum;
            }
            break;
        }
    }

    return output;
}
