import {
    ARRAY_ENCODING_TYPE_INDEX,
    ARRAY_ENCODING_INT_TYPE_INDEX,
    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_INT_VLQ,
    ARRAY_ENCODING_VLQ_4BIT_INDEX,
    ARRAY_ENCODING_INT_VLQ_4BIT_INDEX,
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
    ARRAY_LOWERING_MIN,
    ARRAY_ENCODING_BIT_PACKING,
    ARRAY_ENCODING_INT_BIT_PACKING
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

    switch (method) {
        case ARRAY_ENCODING_TYPE_INDEX:
        case ARRAY_ENCODING_INT_TYPE_INDEX:
        case ARRAY_ENCODING_BIT_PACKING:
        case ARRAY_ENCODING_INT_BIT_PACKING:
            encoding |= reader.readUint8() << 8;
            break;
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
                output[start + i] = reader.readVlq();
            }
            break;
        }

        case ARRAY_ENCODING_INT_VLQ: {
            for (let i = 0; i < numberCount; i++) {
                output[start + i] = reader.readIntVar();
            }
            break;
        }

        case ARRAY_ENCODING_VLQ_4BIT_INDEX: {
            const indexBytes = reader.readBytes(Math.ceil(numberCount / 2));

            for (let i = 0, indexByte = 0; i < numberCount; i++) {
                // Since an index byte encodes 2 numbers:
                // - Read a high 4 bits for odd indecies
                // - Read a byte for even indecies
                indexByte = i & 1
                    ? indexByte >> 4
                    : indexBytes[i >> 1];

                // A highest bit of 4bits is a carry bit, lower 3 bits are payload
                output[start + i] = indexByte & 0x08
                    ? reader.readVlq() * 8 + (indexByte & 0x07)
                    : indexByte & 0x07;
            }
            break;
        }

        case ARRAY_ENCODING_INT_VLQ_4BIT_INDEX: {
            const indexBytes = reader.readBytes(Math.ceil(numberCount / 2));

            for (let i = 0, indexByte = 0; i < numberCount; i++) {
                // Since an index byte encodes 2 numbers:
                // - Read a high 4 bits for odd indecies
                // - Read a byte for even indecies
                indexByte = i & 1
                    ? indexByte >> 4
                    : indexBytes[i >> 1];

                const sign = indexByte & 0x04 ? -1 : 1;

                // A highest bit of 4bits is a carry bit, lower 2 bits are payload
                output[start + i] = indexByte & 0x08
                    ? sign * (reader.readVlq() * 4 + (indexByte & 0x03))
                    : sign * (indexByte & 0x03);
            }

            break;
        }

        case ARRAY_ENCODING_BIT_PACKING: {
            const bitsPerNumber = encoding >> 8;
            const mask = (1 << bitsPerNumber) - 1;
            const bytes = reader.readBytes(Math.ceil(numberCount * bitsPerNumber / 8));

            let bytesPos = 0;
            let left = 0;
            let buffer = 0;

            for (let i = 0; i < numberCount; i++) {
                while (left < bitsPerNumber) {
                    buffer |= bytes[bytesPos] << left;
                    left += 8;
                    bytesPos++;
                }

                output[start + i] = buffer & mask;

                buffer >>= bitsPerNumber;
                left -= bitsPerNumber;
            }

            break;
        }

        case ARRAY_ENCODING_INT_BIT_PACKING: {
            const bitsPerNumber = encoding >> 8;
            const mask = (1 << bitsPerNumber) - 1;
            const bytes = reader.readBytes(Math.ceil(numberCount * bitsPerNumber / 8));

            let bytesPos = 0;
            let left = 0;
            let buffer = 0;

            for (let i = 0; i < numberCount; i++) {
                while (left < bitsPerNumber) {
                    buffer |= bytes[bytesPos] << left;
                    left += 8;
                    bytesPos++;
                }

                output[start + i] = buffer & 1 ? -((buffer & mask) >> 1) : (buffer & mask) >> 1;

                buffer >>= bitsPerNumber;
                left -= bitsPerNumber;
            }

            break;
        }

        case ARRAY_ENCODING_PROGRESSION: {
            let prev = output[0] = reader.readIntVar();
            const step = reader.readIntVar();

            for (let i = 1; i < arrayLength; i++) {
                prev = output[i] = prev + step;
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

            if (typeCount > 1) {
                const types = reader.readTypeIndex(numberCount, typeBitmap);

                for (let i = 0; i < numberCount; i++) {
                    output[start + i] = readNumber(reader, types[i]);
                }
            } else {
                const type = 31 - Math.clz32(typeBitmap);

                for (let i = 0; i < numberCount; i++) {
                    output[start + i] = readNumber(reader, type);
                }
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
