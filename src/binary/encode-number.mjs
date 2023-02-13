import { stat } from './debug-stat.mjs';
import { getIntType } from './encode-get-type.mjs';
import {
    TYPE_UINT_8,
    TYPE_UINT_16,
    TYPE_UINT_24,
    TYPE_UINT_32,
    TYPE_UINT_32_VAR,
    TYPE_NEG_INT
} from './const.mjs';

export function minNumArraySliceEncoding(writer, array, disMin, start = 0, end = array.length) {
    const arrayLength = end - start;
    let defaultBytes = 0;
    let vlqBytes = 0;
    let vlqBytes2 = Math.ceil(arrayLength / 2);
    // let vlqBytes2_ = Math.ceil(arrayLength / 2);
    // let vlq4Bytes = 0;
    // let vlq4Bytes_small = 0;
    // let vlq8_4_bytes = 0;
    // let vlq8_small_big = 0;
    let progressionStep = array[start + 1] - array[start];
    let progressionBytes = Infinity;
    let enumBytes = Infinity;
    let typeBitmap = 0;
    let typeCount = 0;
    let minN = array[start];
    const values = new Set();
    const ENUM_MAX_VALUES = 32;

    for (let i = start; i < end; i++) {
        const n = array[i];
        const elemType = getIntType(n);
        // const vlqn = writer.vlqBytesNeeded(n);

        // vlqBytes += vlqn;
        // vlqBytes2 += n >> 3 ? writer.vlqBytesNeeded(n >> 3) : 0;

        if (((typeBitmap >> elemType) & 1) === 0) {
            typeBitmap |= (1 << elemType);
            typeCount++;
        }

        if (n < minN) {
            minN = n;
        }

        if (values.size <= ENUM_MAX_VALUES) {
            values.add(n);
        }

        if (i !== start && progressionStep !== n - array[i - 1]) {
            progressionStep = false;
        }

        switch (elemType) {
            case TYPE_UINT_8:
                defaultBytes += 1;
                vlqBytes += n > 0x7f ? 2 : 1;
                vlqBytes2 += n > 0x07 ? 1 : 0;
                // vlqBytes2_ += n > 0x07 ? 1 : 0;
                // vlq4Bytes += n < 2 ? .5 : n < 32 ? 1 : 1.5;
                // vlq4Bytes_small += n < 8 ? .5 : n <= 0x3f ? 1 : 1.5;
                // vlq8_4_bytes += n <= 0x3f ? 1 : 2;
                // vlq8_small_big += n <= 0x7f ? 1 : 2;
                break;
            case TYPE_UINT_16:
                defaultBytes += 2;
                vlqBytes += n > 0x3fff ? 3 : 2;
                vlqBytes2 += n > 0x03ff ? 2 : 1;
                // vlqBytes2_ += n > 518 /* 0x01ff + 7 */ ? 2 : 1;
                // vlq4Bytes += n < 512 ? 1.5 : n < 8192 ? 2 : 2.5;
                // vlq4Bytes_small += n <= 0x3ff ? 1.5 : Infinity;
                // vlq8_4_bytes += n <= 0x3fff ? 2 : 3;
                // vlq8_small_big += n <= 0x1fff ? 2 : 3;
                break;
            case TYPE_UINT_24:
                defaultBytes += 3;
                vlqBytes += n > 0x001f_ffff ? 4 : 3;
                vlqBytes2 += n > 0x0001_ffff ? 3 : 2;
                // vlqBytes2_ += n > 131078 /* 0x01ffff + 7 */ ? 3 : 2;
                // vlq4Bytes += n < 131_072 ? 2.5 : n < 2_097_152 ? 3 : 3.5;
                // vlq4Bytes_small = Infinity;
                // vlq8_4_bytes += n <= 0x003f_ffff ? 3 : 4;
                // vlq8_small_big += n <= 0x1fffff ? 3 : 4;
                break;
            case TYPE_UINT_32:
                defaultBytes += 4;
                vlqBytes += n > 0x0fff_ffff ? 5 : 4;
                vlqBytes2 += n > 0x00ff_ffff ? 4 : 3;
                // vlqBytes2_ += n > 33554438 /* 0x01ffffff + 7 */ ? 4 : 3;
                // vlq4Bytes += n < 33_554_432 ? 3.5 : n < 536_870_912 ? 4 : Infinity;
                // vlq4Bytes_small = Infinity;
                // vlq8_4_bytes += n <= 0x3fff_ffff ? 4 : Infinity;
                // vlq8_small_big += n <= 0x1fffffff ? 4 : Infinity;
                break;
            case TYPE_UINT_32_VAR: {
                const vlqn = writer.vlqBytesNeeded(n);

                defaultBytes += vlqn;
                vlqBytes += vlqn;
                vlqBytes2 += writer.vlqBytesNeeded((n - (n & 0x07)) / 8); // safe ">> 3" for big numbers
                // vlqBytes2_ += writer.vlqBytesNeeded(n - (n & 0xffffffff)) + 4;
                // vlq4Bytes = Infinity;
                // vlq4Bytes_small = Infinity;
                // vlq8_4_bytes = Infinity;
                // vlq8_small_big = Infinity;
                break;
            }
            case TYPE_NEG_INT: {
                const n2 = -2 * n;
                const vlqn = writer.vlqBytesNeeded(n2);

                defaultBytes += vlqn;
                // vlqBytes += vlqn;
                vlqBytes += Infinity;
                // vlqBytes2 += writer.vlqBytesNeeded((n2 - (n2 & 0x07)) / 8);
                vlqBytes2 += Infinity;
                // vlq4Bytes = Infinity;
                // vlq4Bytes_small = Infinity;
                // vlq8_4_bytes = Infinity;
                // vlq8_small_big = Infinity;
                break;
            }
        }
    }

    // evaluate enum
    if (values.size <= ENUM_MAX_VALUES) {
        const valuesBitsPerType = 32 - Math.clz32((values.size + typeCount) - 1);
        let valuesBytes = 0;

        for (let value of values) {
            switch (getIntType(value)) {
                // case TYPE_STRING: valuesBytes += writer.vlqBytesNeeded(strings.get(array[0])); break;
                case TYPE_UINT_8: valuesBytes += 1; break;
                case TYPE_UINT_16: valuesBytes += 2; break;
                case TYPE_UINT_24: valuesBytes += 3; break;
                case TYPE_UINT_32: valuesBytes += 4; break;
                case TYPE_UINT_32_VAR: valuesBytes += writer.vlqBytesNeeded(array[0]); break;
                case TYPE_NEG_INT: valuesBytes += writer.vlqBytesNeeded(-array[0]); break;
                // case TYPE_FLOAT_32: valuesBytes += 4; break;
                // case TYPE_FLOAT_64: valuesBytes += 8; break;
            }
        }

        enumBytes =
            Math.ceil(valuesBitsPerType * array.length / 8) +
            valuesBytes;
    }

    // evaluate progression bytes
    if (progressionStep !== false) {
        progressionBytes =
            writer.vlqBytesNeeded(array[start]) +
            writer.vlqBytesNeeded(Math.abs(progressionStep) * 2);
    }

    // default encoding bytes
    defaultBytes += typeCount > 1
        ? Math.ceil((arrayLength * (typeCount <= 2 ? 1 : typeCount <= 4 ? 2 : 3)) / 8)
        : 0;

    // delta with min
    let minDiffBytes = Infinity;
    if (typeCount === 1 && !disMin) {
        minDiffBytes = writer.vlqBytesNeeded(minN);
        for (let i = start; i < end; i++) {
            minDiffBytes += writer.vlqBytesNeeded(array[i] - minN);
        }
    }

    // round up numbers when needed
    // vlq4Bytes = Math.ceil(vlq4Bytes);
    // vlq4Bytes_small = Math.ceil(vlq4Bytes_small);

    // find the most bytes saving encoding
    const candidates = [defaultBytes, progressionBytes, vlqBytes, vlqBytes2, minDiffBytes];
    const minBytes = Math.min(...candidates);
    const encoding = candidates.indexOf(minBytes);

    // console.log({vlqBytes , vlqBytes2})
    // if (minDiffBytes < minBytes) {
    // //     console.log('!', minDiffBytes, minBytes, 'win:', minBytes - minDiffBytes);
    // // }
    // // if (encoding === 3) {
    //     const minNext = Math.min(defaultBytes, vlqBytes, vlqBytes2, progressionBytes);
    //     // console.log('?!', minNext - progressionBytes);
    //     stat.encodeSize += minDiffBytes;
    //     stat.encodeCount++;
    //     stat.encodeMin += minNext;
    //     stat.encodeWin += minNext - minDiffBytes;
    //     stat.encodeDefault += defaultBytes;
    //     stat.encodeWinDefault += defaultBytes - minDiffBytes;
    //     // writer.defaultSize += defaultBytes;
    // }
    // if (vlqBytes < vlqBytes2 && (vlqBytes2 - vlqBytes) > 100) {
    //     console.log('!', vlqBytes2 - vlqBytes);
    // }

    // if (enumBytes < minBytes && (minBytes - enumBytes) > 100) {
    //     console.log('!enum', minBytes - enumBytes);
    // }

    return {
        encoding,
        bytes: minBytes
    };
}

export function findNumArrayBestEncoding(writer, array, sectionSize = 32) {
    // const sectionStatTemp = {};
    let { encoding, bytes } = minNumArraySliceEncoding(writer, array, 1);
    let min = array[0];
    for (let i = 0; i < array.length; i++) {
        if (array[i] < min) {
            min = array[i];
        }
    }
    const { encoding: x, bytes: xb } = minNumArraySliceEncoding(writer, array.map(x => x - min));
    const fxb = xb + writer.vlqBytesNeeded(min);
    // const deltas = array.map((item, idx) => idx > 0 ? array[idx] - array[idx - 1] : array[idx]);
    // const { encoding: x, bytes: xb } = minNumArraySliceEncoding(writer, deltas, 1);
    // const fxb = xb;

    if (stat.enabled && bytes > fxb) {
        // encoding = x;
        // for (let i = 0; i < array.length; i++) {
        //     array[i] = deltas[i];
        // }
        // console.log({ x, bytes, fxb, win: bytes - fxb });
        stat.encodeSize += fxb;
        stat.encodeCount++;
        stat.encodeMin += bytes;
        stat.encodeWin += bytes - fxb;
    }

    // const deltasElemTypes = getElemenTypes(deltas);
    // const estimatesDeltas = numEncodingVlq(deltas, deltasElemTypes);
    // let sections = 0;

    // for (let i = 0; i < array.length; i += sectionSize) {
    //     const sectionEstimates = numEncodingVlq(array, elemTypes, i, Math.min(i + sectionSize, array.length));
    //     const sectionEstimatesDeltas = numEncodingVlq(deltas, deltasElemTypes, i, Math.min(i + sectionSize, array.length));
    //     const min1 = Math.min(...Object.values(sectionEstimates));
    //     const min2 = Math.min(...Object.values(sectionEstimatesDeltas));
    //     const minEstimates = min1 <= min2 ? sectionEstimates : sectionEstimatesDeltas;
    //     const min = min1 <= min2 ? min1 : min2;

    //     // a b x x cccc
    //     // | | | | | encoding type
    //     // | | | | ?
    //     // | | | ?
    //     // | | base number is last number of prev section
    //     // | section multiplication - next byte is count

    //     // encodings
    //     // 0000 – index (default)
    //     // 0001 - single type?
    //     // 0010 - vlq
    //     // 0011 - vlq + index / ARRAY_ENCODING_VLQ2
    //     //        index contains 4 bits for each array's element
    //     //        0xxx - 3 bits number, use as is
    //     //        1xxx - 3 lower bits of a number + vlq(rest bits)

    //     for (const [k, v] of Object.entries(minEstimates)) {
    //         if (v === min) {
    //             const kx = minEstimates === sectionEstimates ? k : k + '_sdelta';
    //             sectionStatTemp[kx] = sectionStatTemp[kx] || { size: 0, indexSize: 0, count: 0 };
    //             sectionStatTemp[kx].count++;
    //             sectionStatTemp[kx].size += 1 + v;
    //             sectionStatTemp[kx].indexSize += 1 + sectionEstimates.indexBytes;
    //             break;
    //         }
    //     }

    //     sections += 1 + min;
    // }

    // estimates.sections = sections;

    // return { estimates, sectionStatTemp, estimatesDeltas };
    return { encoding, bytes };
}
