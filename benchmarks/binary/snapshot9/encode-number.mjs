import {
    MAX_UINT_8,
    MAX_UINT_16,
    MAX_UINT_24,
    // MAX_UINT_28,
    MAX_UINT_32,
    MIN_INT_8,
    MAX_INT_8,
    MIN_INT_16,
    MAX_INT_16,
    MIN_INT_24,
    MAX_INT_24,
    MIN_INT_32,
    MAX_INT_32,

    INT_8,
    INT_16,
    INT_24,
    INT_32,
    INT_32_VAR,
    UINT_8,
    UINT_16,
    UINT_24,
    UINT_32,
    UINT_32_VAR,
    FLOAT_32,
    FLOAT_64,

    ARRAY_ENCODING_TYPE_INDEX,
    ARRAY_ENCODING_INT_TYPE_INDEX,
    ARRAY_ENCODING_PROGRESSION,
    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_INT_VLQ,
    ARRAY_ENCODING_VLQ_4BIT_INDEX,
    ARRAY_ENCODING_INT_VLQ_4BIT_INDEX,

    ARRAY_LOWERING_DELTA,
    ARRAY_LOWERING_MIN,

    BIT_COUNT,
    UINT_BITS,
    FLOAT_BITS,
    INT_BITS,
    ARRAY_ENCODING_BIT_PACKING,
    ARRAY_ENCODING_INT_BIT_PACKING,
    ARRAY_LOWERING_NONE
} from './const.mjs';

const USE_INT_FLAG = 0x0001_0000;
const TEST_FLOAT_32 = new Float32Array(1);
const allCosts = new Uint32Array(16);
const noLoweringCosts = allCosts.subarray(0, 8);
const deltaLoweringCosts = allCosts.subarray(8, 16);
// const minLoweringCosts = allCosts.subarray(16);

export function getFloatType(num) {
    TEST_FLOAT_32[0] = num;
    return TEST_FLOAT_32[0] === num ? FLOAT_32 : FLOAT_64;
}

export function getIntType(num) {
    // The return expressions are written so that only 2 or 3 comparisons
    // are needed to choose a type of 5

    if (num < 0) {
        return (
            num < MIN_INT_16
                ? num < MIN_INT_24
                    ? num < MIN_INT_32
                        ? INT_32_VAR
                        : INT_32
                    : INT_24
                : num < MIN_INT_8
                    ? INT_16
                    : INT_8
        );
    }

    return (
        num > MAX_INT_16
            ? num > MAX_INT_24
                ? num > MAX_INT_32
                    ? INT_32_VAR
                    : INT_32
                : INT_24
            : num > MAX_INT_8
                ? INT_16
                : INT_8
    );
}

export function getUintType(num) {
    // The return expression is written so that only 2 or 3 comparisons
    // are needed to choose a type of 5
    return (
        num > MAX_UINT_16
            ? num > MAX_UINT_24
                ? num > MAX_UINT_32
                    ? UINT_32_VAR
                    : UINT_32
                : UINT_24
            : num > MAX_UINT_8
                ? UINT_16
                : UINT_8
    );
}

export function getNumericType(num) {
    if (!Number.isInteger(num)) {
        return getFloatType(num);
    }

    return num < 0
        ? getIntType(num)
        : getUintType(num);
}

export function getSignedNumericType(num) {
    if (!Number.isInteger(num)) {
        return getFloatType(num);
    }

    return getIntType(num);
}

function maxMinMaxBits(min, max) {
    const maxAbsNum = Math.max(Math.abs(min), Math.abs(max));
    const sign = min < 0 ? 1 : 0;

    return Math.max(32 - Math.clz32(maxAbsNum) + sign, 1);
}

function estimateUintCosts(writer, bytes, num, numType) {
    switch (numType) {
        case UINT_8:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 1;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x7f ? 2 : 1;
            bytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] += num > 0x07 ? 1 : 0;
            break;

        case UINT_16:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 2;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x3fff ? 3 : 2;
            bytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] += num > 0x03ff ? 2 : 1;
            break;

        case UINT_24:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 3;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x001f_ffff ? 4 : 3;
            bytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] += num > 0x0001_ffff ? 3 : 2;
            break;

        case UINT_32:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 4;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x0fff_ffff ? 5 : 4;
            bytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] += num > 0x00ff_ffff ? 4 : 3;
            break;

        case UINT_32_VAR: {
            const vlqn = writer.vlqBytesNeeded(num);

            bytes[ARRAY_ENCODING_TYPE_INDEX] += vlqn;
            bytes[ARRAY_ENCODING_VLQ] += vlqn;
            bytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] += writer.vlqBytesNeeded((num - (num & 0x07)) / 8); // safe ">> 3" for big numbers
            break;
        }
    }
}

function estimateIntCosts(writer, bytes, num, numType) {
    if (num < 0) {
        num = -num;
    }

    switch (numType) {
        case INT_8: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 1;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x3f ? 2 : 1;
            bytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] += num > 0x03 ? 1 : 0;
            break;
        }
        case INT_16: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 2;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x1fff ? 3 : 2;
            bytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] += num > 0x01ff ? 2 : 1;
            break;
        }
        case INT_24: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 3;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x000f_ffff ? 4 : 3;
            bytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] += num > 0x0000_ffff ? 3 : 2;
            break;
        }
        case INT_32: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 4;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x07ff_ffff ? 5 : 4;
            bytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] += num > 0x007f_ffff ? 4 : 3;
            break;
        }
        case INT_32_VAR: {
            const nSigned = 2 * num;
            const vlqn = writer.vlqBytesNeeded(nSigned);

            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += vlqn;
            bytes[ARRAY_ENCODING_INT_VLQ] += vlqn;
            bytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] += writer.vlqBytesNeeded((nSigned - (nSigned & 0x07)) / 8);  // safe ">> 2" for big numbers
            break;
        }
    }
}

function estimateNumberCosts(writer, bytes, num) {
    const intType = getIntType(num);

    estimateIntCosts(writer, bytes, num, intType);

    if (num >= 0) {
        const uintType = getUintType(num);

        estimateUintCosts(writer, bytes, num, uintType);

        return (1 << intType) | (1 << uintType);
    }

    return (1 << intType) | USE_INT_FLAG;
}

function pickDefaultEncoding(arrayLength, encodingBytes, typeBitmap, countHeaderBytes) {
    const useInt = typeBitmap & USE_INT_FLAG;
    const method = useInt
        ? ARRAY_ENCODING_INT_TYPE_INDEX
        : ARRAY_ENCODING_TYPE_INDEX;

    const packedTypeBitmap = useInt
        ? ((typeBitmap >> 8) | (typeBitmap & FLOAT_BITS)) & 0xff
        : typeBitmap & (UINT_BITS | FLOAT_BITS);

    const typeCount = BIT_COUNT[packedTypeBitmap];
    const minBytes =
        encodingBytes[method] +
        (typeCount > 1 ? Math.ceil((arrayLength * (typeCount <= 2 ? 1 : typeCount <= 4 ? 2 : 3)) / 8) : 0) +
        (countHeaderBytes ? 2 : 0); // header

    return {
        encoding: (packedTypeBitmap << 8) | method,
        minBytes
    };
}

function pickIntAdvancedEncoding(arrayLength, encodingBytes, typeBitmap, countHeaderBytes, lowering, maxBits) {
    const bitPackBytes = maxBits <= 16 ? Math.ceil(arrayLength * maxBits / 8) + (countHeaderBytes ? 2 : 0) : Infinity;
    let { encoding, minBytes } = pickDefaultEncoding(arrayLength, encodingBytes, typeBitmap, countHeaderBytes);
    const method = encoding & 0x0f;

    if (method === ARRAY_ENCODING_INT_TYPE_INDEX) {
        const vlqBytes =
            encodingBytes[ARRAY_ENCODING_INT_VLQ] +
            (countHeaderBytes ? 1 : 0);
        const vlq4bitIndexBytes =
            encodingBytes[ARRAY_ENCODING_INT_VLQ_4BIT_INDEX] +
            Math.ceil(arrayLength / 2) +
            (countHeaderBytes ? 1 : 0);

        if (bitPackBytes < minBytes) {
            encoding = (maxBits << 8) | ARRAY_ENCODING_INT_BIT_PACKING;
            minBytes = bitPackBytes;
        }

        if (vlqBytes < minBytes) {
            encoding = ARRAY_ENCODING_INT_VLQ;
            minBytes = vlqBytes;
        }

        if (vlq4bitIndexBytes < minBytes) {
            encoding = ARRAY_ENCODING_INT_VLQ_4BIT_INDEX;
            minBytes = vlq4bitIndexBytes;
        }
    } else {
        const vlqBytes =
            encodingBytes[ARRAY_ENCODING_VLQ] +
            (countHeaderBytes ? 1 : 0);
        const vlq4bitIndexBytes =
            encodingBytes[ARRAY_ENCODING_VLQ_4BIT_INDEX] +
            Math.ceil(arrayLength / 2) +
            (countHeaderBytes ? 1 : 0);

        if (bitPackBytes < minBytes) {
            encoding = (maxBits << 8) | ARRAY_ENCODING_BIT_PACKING;
            minBytes = bitPackBytes;
        }

        if (vlqBytes < minBytes) {
            encoding = ARRAY_ENCODING_VLQ;
            minBytes = vlqBytes;
        }

        if (vlq4bitIndexBytes < minBytes) {
            encoding = ARRAY_ENCODING_VLQ_4BIT_INDEX;
            minBytes = vlq4bitIndexBytes;
        }
    }

    return {
        encoding: encoding | lowering,
        minBytes
    };
}

// 1st byte:
//
//   76 543210
//   ┬─ ─┬────
//   │   └ method
//   └ lowering
//
// 2rd byte – type bitmap (optional):
//
//   765 43210
//   ─┬─ ─┬───
//    │   └ 32var, 32, 24, 16, 8 (int – when useInt=1, uint – otherwise)
//    └ decimal, float64, float32
//
export function minNumArraySliceEncoding(writer, array, countHeaderBytes = true, start = 0, end = array.length) {
    const arrayLength = end - start;
    let typeBitmap = 0;
    let useFloat = false;
    let minNum = array[start];
    let maxNum = array[start];

    allCosts.fill(0);

    for (let i = start; i < end; i++) {
        const num = array[i];

        if (Number.isInteger(num)) {
            typeBitmap |= estimateNumberCosts(writer, noLoweringCosts, num);
        } else {
            typeBitmap |= 1 << getFloatType(num);
            useFloat = true;
        }

        if (num < minNum) {
            minNum = num;
        }

        if (num > maxNum) {
            maxNum = num;
        }
    }

    // use default encoding when float numbers are used
    if (useFloat || arrayLength < 2) {
        return pickDefaultEncoding(arrayLength, noLoweringCosts, typeBitmap, countHeaderBytes);
    }

    // collect costs for lowered numbers
    let progressionStep = array[start + 1] - array[start];
    let maxDelta = progressionStep;
    let minDelta = progressionStep;
    let deltaTypeBitmap = 0;
    // let minTypeBitmap = 0;

    for (let i = start; i < end; i++) {
        const num = array[i];

        // minTypeBitmap |= estimateNumberCosts(writer, minLoweringCosts, num - minNum);

        if (i !== start) {
            const delta = num - array[i - 1];

            deltaTypeBitmap |= estimateNumberCosts(writer, deltaLoweringCosts, delta);

            if (progressionStep !== delta) {
                progressionStep = false;
            }

            if (delta > maxDelta) {
                maxDelta = delta;
            }

            if (delta < minDelta) {
                minDelta = delta;
            }
        }
    }

    // Find the most bytes saving encoding
    let { encoding, minBytes } = pickIntAdvancedEncoding(
        arrayLength,
        noLoweringCosts,
        typeBitmap,
        countHeaderBytes,
        ARRAY_LOWERING_NONE,
        maxMinMaxBits(minNum, maxNum)
    );
    let deltaLowering = pickIntAdvancedEncoding(
        arrayLength - 1,
        deltaLoweringCosts,
        deltaTypeBitmap,
        countHeaderBytes,
        ARRAY_LOWERING_DELTA,
        maxMinMaxBits(minDelta, maxDelta)
    );

    // Add costs for the first number encoding
    let deltaLoweringMinBytes = deltaLowering.minBytes + writer.vlqBytesNeeded(Math.abs(array[start]) * 2);
    // let minLoweringMinBytes = minLowering.minBytes + writer.vlqBytesNeeded(Math.abs(minNum) * 2);

    if (deltaLoweringMinBytes < minBytes) {
        encoding = deltaLowering.encoding;
        minBytes = deltaLoweringMinBytes;
    }

    // try progression encoding
    if (arrayLength > 2 && progressionStep !== false) {
        const progressionBytes =
            writer.vlqBytesNeeded(array[start]) +
            writer.vlqBytesNeeded(Math.abs(progressionStep) * 2) +
            (countHeaderBytes ? 1 : 0); // header

        if (progressionBytes < minBytes) {
            encoding = ARRAY_ENCODING_PROGRESSION;
            minBytes = progressionBytes;
        }
    }

    return { encoding, minBytes };
}

export function findNumArrayBestEncoding(writer, array, countHeaderBytes = true) {
    const { encoding } = minNumArraySliceEncoding(writer, array, countHeaderBytes);

    return encoding;
}

export function writeNumericArrayHeader(writer, encoding) {
    const method = encoding & 0x0f;

    switch (method) {
        case ARRAY_ENCODING_TYPE_INDEX:
        case ARRAY_ENCODING_INT_TYPE_INDEX:
        case ARRAY_ENCODING_BIT_PACKING:
        case ARRAY_ENCODING_INT_BIT_PACKING:
            writer.writeNumber(encoding, UINT_16);
            break;
        default:
            writer.writeNumber(encoding, UINT_8);
    }
}

export function writeNumericArray(writer, array, knownLength) {
    const encoding = findNumArrayBestEncoding(writer, array);

    if (!knownLength) {
        writer.writeVlq(array.length);
    }

    writeNumericArrayHeader(writer, encoding);
    writeNumbers(writer, array, encoding);
}

export function writeNumbers(writer, input, encoding) {
    const method = encoding & 0x0f;
    const lowering = encoding & 0x30;
    let numbers = input;

    // console.log({ lowering, method, bitmap: encoding >> 8 });
    // console.log({ numbers });

    switch (lowering) {
        case ARRAY_LOWERING_DELTA: {
            writer.writeIntVar(numbers[0]);
            numbers = Array.from({ length: input.length - 1 }, (_, idx) =>
                input[idx + 1] - input[idx]
            );
            break;
        }

        case ARRAY_LOWERING_MIN: {
            let minNum = numbers[0];

            for (let i = 1; i < numbers.length; i++) {
                if (numbers[i] < minNum) {
                    minNum = numbers[i];
                }
            }

            writer.writeIntVar(minNum);
            numbers = Array.from(input, (num) =>
                num - minNum
            );
            break;
        }
    }

    switch (method) {
        case ARRAY_ENCODING_VLQ: {
            for (let i = 0; i < numbers.length; i++) {
                writer.writeVlq(numbers[i]);
            }

            break;
        }

        case ARRAY_ENCODING_INT_VLQ: {
            for (let i = 0; i < numbers.length; i++) {
                writer.writeIntVar(numbers[i]);
            }

            break;
        }

        case ARRAY_ENCODING_VLQ_4BIT_INDEX: {
            // write index
            for (let i = 0; i < numbers.length; i += 2) {
                writer.writeNumber(
                    (numbers[i] > 0x07 ? 0x08 : 0x00) | (numbers[i] & 0x07) |
                    (numbers[i + 1] > 0x07 ? 0x80 : 0x00) | ((numbers[i + 1] & 0x07) << 4),
                    UINT_8
                );
            }

            // write values
            for (let i = 0; i < numbers.length; i++) {
                if (numbers[i] > 0x07) {
                    writer.writeVlq((numbers[i] - (numbers[i] & 0x07)) / 8);
                }
            }

            break;
        }

        case ARRAY_ENCODING_INT_VLQ_4BIT_INDEX: {
            // write index
            for (let i = 0; i < numbers.length; i += 2) {
                const lo = numbers[i];
                const abslo = Math.abs(lo);
                const hi = numbers[i + 1] || 0;
                const abshi = Math.abs(hi);

                writer.writeNumber(
                    (abslo > 0x03 ? 0x08 : 0x00) | (abslo & 0x03) | (lo < 0 ? 0x04 : 0x00) |
                    (abshi > 0x03 ? 0x80 : 0x00) | (((abshi & 0x03) | (hi < 0 ? 0x04 : 0x00)) << 4),
                    UINT_8
                );
            }

            // write values
            for (let i = 0; i < numbers.length; i++) {
                const n = numbers[i] >= 0 ? numbers[i] : -numbers[i];

                if (n > 0x03) {
                    writer.writeVlq((n - (n & 0x03)) / 4);
                }
            }

            break;
        }

        case ARRAY_ENCODING_BIT_PACKING: {
            const bitsPerNumber = encoding >> 8;

            let shift = 0;
            let chunk = 0;

            for (let i = 0; i < numbers.length; i++) {
                chunk |= numbers[i] << shift;
                shift += bitsPerNumber;

                if (shift >= 16) {
                    writer.writeNumber(chunk, UINT_16);
                    shift -= 16;
                    chunk >>= 16;
                }
            }

            if (shift > 8) {
                writer.writeNumber(chunk, UINT_16);
            } else if (shift > 0) {
                writer.writeNumber(chunk, UINT_8);
            }

            break;
        }

        case ARRAY_ENCODING_INT_BIT_PACKING: {
            const bitsPerNumber = encoding >> 8;

            let shift = 0;
            let chunk = 0;

            for (let i = 0; i < numbers.length; i++) {
                const num = numbers[i];

                chunk |= (num < 0 ? (-num << 1) | 1 : num << 1) << shift;
                shift += bitsPerNumber;

                if (shift >= 16) {
                    writer.writeNumber(chunk, UINT_16);
                    shift -= 16;
                    chunk >>= 16;
                }
            }

            if (shift > 8) {
                writer.writeNumber(chunk, UINT_16);
            } else if (shift > 0) {
                writer.writeNumber(chunk, UINT_8);
            }

            break;
        }

        case ARRAY_ENCODING_PROGRESSION: {
            writer.writeIntVar(numbers[0]);
            writer.writeIntVar(numbers[1] - numbers[0]);
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
                const types = useInt
                    ? numbers.map(getSignedNumericType)
                    : numbers.map(getNumericType);

                writer.writeTypeIndex(types, typeBitmap);

                for (let i = 0; i < numbers.length; i++) {
                    writer.writeNumber(numbers[i], types[i]);
                }
            } else {
                const type = 31 - Math.clz32(typeBitmap);

                for (let i = 0; i < numbers.length; i++) {
                    writer.writeNumber(numbers[i], type);
                }
            }

            break;
        }

        default:
            throw new Error('Unknown numeric array encoding method:', method);
    }
}
