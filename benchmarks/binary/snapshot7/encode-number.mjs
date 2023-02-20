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
    let typeIndexBytes = 0;
    let vlqBytes = 0;
    let vlqBytes2 = Math.ceil(arrayLength / 2);
    let progressionStep = array[start + 1] - array[start];
    let progressionBytes = Infinity;
    let typeBitmap = 0;
    let typeCount = 0;
    let minN = array[start];

    for (let i = start; i < end; i++) {
        const n = array[i];
        const elemType = getIntType(n);

        if (((typeBitmap >> elemType) & 1) === 0) {
            typeBitmap |= (1 << elemType);
            typeCount++;
        }

        if (n < minN) {
            minN = n;
        }

        if (i !== start && progressionStep !== n - array[i - 1]) {
            progressionStep = false;
        }

        switch (elemType) {
            case TYPE_UINT_8:
                typeIndexBytes += 1;
                vlqBytes += n > 0x7f ? 2 : 1;
                vlqBytes2 += n > 0x07 ? 1 : 0;
                break;
            case TYPE_UINT_16:
                typeIndexBytes += 2;
                vlqBytes += n > 0x3fff ? 3 : 2;
                vlqBytes2 += n > 0x03ff ? 2 : 1;
                break;
            case TYPE_UINT_24:
                typeIndexBytes += 3;
                vlqBytes += n > 0x001f_ffff ? 4 : 3;
                vlqBytes2 += n > 0x0001_ffff ? 3 : 2;
                break;
            case TYPE_UINT_32:
                typeIndexBytes += 4;
                vlqBytes += n > 0x0fff_ffff ? 5 : 4;
                vlqBytes2 += n > 0x00ff_ffff ? 4 : 3;
                break;
            case TYPE_UINT_32_VAR: {
                const vlqn = writer.vlqBytesNeeded(n);

                typeIndexBytes += vlqn;
                vlqBytes += vlqn;
                vlqBytes2 += writer.vlqBytesNeeded((n - (n & 0x07)) / 8); // safe ">> 3" for big numbers
                break;
            }
            case TYPE_NEG_INT: {
                const n2 = -2 * n;
                const vlqn = writer.vlqBytesNeeded(n2);

                typeIndexBytes += vlqn;
                vlqBytes += Infinity;
                vlqBytes2 += Infinity;
                break;
            }
        }
    }

    // evaluate progression bytes
    if (progressionStep !== false) {
        progressionBytes =
            writer.vlqBytesNeeded(array[start]) +
            writer.vlqBytesNeeded(Math.abs(progressionStep) * 2);
    }

    // default encoding bytes
    typeIndexBytes += typeCount > 1
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

    // find the most bytes saving encoding
    const candidates = [typeIndexBytes, progressionBytes, vlqBytes, vlqBytes2, minDiffBytes];
    const minBytes = Math.min(...candidates);
    const encoding = candidates.indexOf(minBytes);

    return {
        encoding,
        bytes: minBytes
    };
}

export function findNumArrayBestEncoding(writer, array) {
    let { encoding, bytes } = minNumArraySliceEncoding(writer, array, 1);

    return { encoding, bytes };
}
