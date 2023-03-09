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
    ARRAY_ENCODING_VLQ2,
    ARRAY_ENCODING_INT_VLQ2,

    ARRAY_LOWERING_DELTA,
    ARRAY_LOWERING_MIN,

    BIT_COUNT,
    UINT_BITS,
    FLOAT_BITS,
    INT_BITS
} from './const.mjs';

const USE_INT_FLAG = 0x0001_0000;
const TEST_FLOAT_32 = new Float32Array(1);
const allCosts = new Uint32Array(16);
const noLoweringCosts = allCosts.subarray(0, 8);
const deltaLoweringCosts = allCosts.subarray(8, 16);
// const minLoweringCosts = encodingBytes.subarray(16);

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

function estimateUintCosts(writer, bytes, num, numType) {
    switch (numType) {
        case UINT_8:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 1;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x7f ? 2 : 1;
            bytes[ARRAY_ENCODING_VLQ2] += num > 0x07 ? 1 : 0;
            break;

        case UINT_16:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 2;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x3fff ? 3 : 2;
            bytes[ARRAY_ENCODING_VLQ2] += num > 0x03ff ? 2 : 1;
            break;

        case UINT_24:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 3;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x001f_ffff ? 4 : 3;
            bytes[ARRAY_ENCODING_VLQ2] += num > 0x0001_ffff ? 3 : 2;
            break;

        case UINT_32:
            bytes[ARRAY_ENCODING_TYPE_INDEX] += 4;
            bytes[ARRAY_ENCODING_VLQ] += num > 0x0fff_ffff ? 5 : 4;
            bytes[ARRAY_ENCODING_VLQ2] += num > 0x00ff_ffff ? 4 : 3;
            break;

        case UINT_32_VAR: {
            const vlqn = writer.vlqBytesNeeded(num);

            bytes[ARRAY_ENCODING_TYPE_INDEX] += vlqn;
            bytes[ARRAY_ENCODING_VLQ] += vlqn;
            bytes[ARRAY_ENCODING_VLQ2] += writer.vlqBytesNeeded((num - (num & 0x07)) / 8); // safe ">> 3" for big numbers
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
            bytes[ARRAY_ENCODING_INT_VLQ2] += num > 0x03 ? 1 : 0;
            break;
        }
        case INT_16: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 2;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x1fff ? 3 : 2;
            bytes[ARRAY_ENCODING_INT_VLQ2] += num > 0x01ff ? 2 : 1;
            break;
        }
        case INT_24: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 3;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x000f_ffff ? 4 : 3;
            bytes[ARRAY_ENCODING_INT_VLQ2] += num > 0x0000_ffff ? 3 : 2;
            break;
        }
        case INT_32: {
            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += 4;
            bytes[ARRAY_ENCODING_INT_VLQ] += num > 0x07ff_ffff ? 5 : 4;
            bytes[ARRAY_ENCODING_INT_VLQ2] += num > 0x007f_ffff ? 4 : 3;
            break;
        }
        case INT_32_VAR: {
            const nSigned = 2 * num;
            const vlqn = writer.vlqBytesNeeded(nSigned);

            bytes[ARRAY_ENCODING_INT_TYPE_INDEX] += vlqn;
            bytes[ARRAY_ENCODING_INT_VLQ] += vlqn;
            bytes[ARRAY_ENCODING_INT_VLQ2] += writer.vlqBytesNeeded((nSigned - (nSigned & 0x07)) / 8);  // safe ">> 2" for big numbers
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

function typeIndexEncoding(arrayLength, encodingBytes, typeBitmap) {
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
        (typeCount > 1 ? Math.ceil((arrayLength * (typeCount <= 2 ? 1 : typeCount <= 4 ? 2 : 3)) / 8) : 0);

    return {
        encoding: (packedTypeBitmap << 8) | method,
        minBytes
    };
}

function pickMinBytesEncoding(arrayLength, encodingBytes, typeBitmap, lowering) {
    const vlq2indexBytes = Math.ceil(arrayLength / 2);
    let { encoding, minBytes } = typeIndexEncoding(arrayLength, encodingBytes, typeBitmap);

    if ((encoding & 0x0f) === ARRAY_ENCODING_INT_TYPE_INDEX) {
        if (encodingBytes[ARRAY_ENCODING_INT_VLQ] < minBytes) {
            encoding = ARRAY_ENCODING_INT_VLQ;
            minBytes = encodingBytes[ARRAY_ENCODING_INT_VLQ];
        }

        if (encodingBytes[ARRAY_ENCODING_INT_VLQ2] + vlq2indexBytes < minBytes) {
            encoding = ARRAY_ENCODING_INT_VLQ2;
            minBytes = encodingBytes[ARRAY_ENCODING_INT_VLQ2] + vlq2indexBytes;
        }
    } else {
        if (encodingBytes[ARRAY_ENCODING_VLQ] < minBytes) {
            encoding = ARRAY_ENCODING_VLQ;
            minBytes = encodingBytes[ARRAY_ENCODING_VLQ];
        }

        if (encodingBytes[ARRAY_ENCODING_VLQ2] + vlq2indexBytes < minBytes) {
            encoding = ARRAY_ENCODING_VLQ2;
            minBytes = encodingBytes[ARRAY_ENCODING_VLQ2] + vlq2indexBytes;
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
export function minNumArraySliceEncoding(writer, array, start = 0, end = array.length) {
    const arrayLength = end - start;
    let typeBitmap = 0;
    let useFloat = false;
    let minNum = array[start];

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
    }

    // use default encoding when float numbers are used
    if (useFloat || arrayLength < 2) {
        return typeIndexEncoding(arrayLength, noLoweringCosts, typeBitmap);
    }

    // collect costs for lowered numbers
    let progressionStep = array[start + 1] - start[start];
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
        }
    }

    // Find the most bytes saving encoding
    let { encoding, minBytes } = pickMinBytesEncoding(arrayLength, noLoweringCosts, typeBitmap, 0);
    let deltaLowering = pickMinBytesEncoding(arrayLength - 1, deltaLoweringCosts, deltaTypeBitmap, ARRAY_LOWERING_DELTA);
    let deltaLoweringMinBytes = deltaLowering.minBytes + writer.vlqBytesNeeded(Math.abs(array[start]) * 2);
    // let minLowering = pickMinBytesEncoding(arrayLength, minLoweringCosts, minTypeBitmap, ARRAY_LOWERING_MIN);
    // let minLoweringMinBytes = minLowering.minBytes + writer.vlqBytesNeeded(Math.abs(minNum) * 2);

    if (deltaLoweringMinBytes < minBytes) {
        encoding = deltaLowering.encoding;
        minBytes = deltaLoweringMinBytes;
    }

    // if (minLoweringMinBytes < minBytes) {
    //     encoding = minLowering.encoding;
    //     minBytes = minLoweringMinBytes;
    // }

    // try progression encoding
    if (arrayLength > 2 && progressionStep !== false) {
        const progressionBytes =
            writer.vlqBytesNeeded(array[start]) +
            writer.vlqBytesNeeded(Math.abs(progressionStep) * 2);

        if (progressionBytes < minBytes) {
            encoding = ARRAY_ENCODING_PROGRESSION;
            minBytes = progressionBytes;
        }
    }

    return { encoding, minBytes };
}

export function findNumArrayBestEncoding(writer, array) {
    // const sectionStatTemp = {};
    const { encoding } = minNumArraySliceEncoding(writer, array);
    // console.log(array, {encoding:encoding&0x0f, lowering: encoding&0x30, minBytes});

    // const sectionSize = 32;
    // let sectionBytes = Infinity;
    // if (sectionSize < array.length) {
    //     sectionBytes = 0;
    //     for (let i = 0; i < array.length; i += sectionSize) {
    //         let { encoding, minBytes } = minNumArraySliceEncoding(writer, array, i, i + sectionSize);
    //         sectionBytes += minBytes + (encoding > 255 ? 2 : 1);

    //         // const { encoding: x, bytes: xb } = minNumArraySliceEncoding(writer, deltas, i, i + sectionSize);
    //         // sectionDeltaBytes += xb + 1;

    //         // if (xb < bytes) {
    //         //     sectionMinBytes += xb;
    //         // } else {
    //         //     sectionMinBytes += bytes;
    //         // }
    //     }
    // }

    // if (sectionBytes < minBytes) {
    //     stat.sectionsWin += minBytes - sectionBytes;
    // }

    // let min = array[0];
    // for (let i = 1; i < array.length; i++) {
    //     if (array[i] < min) {
    //         min = array[i];
    //     }
    // }
    // const { encoding: minx, minBytes: minb } = minNumArraySliceEncoding(writer, array.map(x => x - min), 1);
    // if (minb < minBytes && (minBytes - minb > 4)) {
    //     console.log(array);
    //     console.log(array.map(x => x - min), min);
    //     console.log({ minb, minBytes, x: writer.vlqBytesNeeded(min * 2) })
    //     console.log(encoding & 0x0f, { encoding });
    //     process.exit();
    //     stat.minWin += minBytes - minb;
    // }

    // stat.improvementWin += minBytes - Math.min(minBytes, minb, sectionBytes);

    //     const fxminb = minb + writer.vlqBytesNeeded(min);
    //     const { encoding: x, bytes: xb } = minNumArraySliceEncoding(writer, deltas, 1);
    //     const fxb = xb;

    //     if (stat.enabled && fxminb < bytes && fxminb < fxb) {
    //         stat.minWin += Math.min(bytes, fxb) - fxminb;
    //         stat.minWinDefault += bytes - fxminb;
    //     }

    //     if (sectionMinBytes < bytes && sectionMinBytes < fxb) {
    //         stat.sectionBytes += sectionBytes;
    //         stat.sectionDeltaBytes += sectionDeltaBytes;
    //         stat.sectionMinBytes += sectionMinBytes;
    //         stat.sectionWin += Math.min(bytes, fxb) - sectionMinBytes;
    //         stat.winwin += bytes - sectionMinBytes;
    //     } else if (fxb < bytes) {
    //         stat.winwin += bytes - fxb;
    //     }

    //     if (bytes > fxb) {
    //         // encoding = x;
    //         // for (let i = 0; i < array.length; i++) {
    //         //     array[i] = deltas[i];
    //         // }
    //         // console.log({ x, bytes, fxb, win: bytes - fxb });
    //         stat.encodeSize += fxb;
    //         stat.encodeCount++;
    //         stat.encodeMin += bytes;
    //         stat.encodeWin += bytes - fxb;
    //         stat.badbadCount += encoding === 0 ? bytes : 0;
    //         stat.badbad += encoding === 0 ? fxb : 0;
    //     }
    // }

    return encoding;
}

export function writeNumericArrayHeader(writer, encoding) {
    const method = encoding & 0x0f;

    if (method === ARRAY_ENCODING_TYPE_INDEX || method === ARRAY_ENCODING_INT_TYPE_INDEX) {
        writer.writeNumber(encoding, UINT_16);
    } else {
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

        case ARRAY_ENCODING_VLQ2: {
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

        case ARRAY_ENCODING_INT_VLQ2: {
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
