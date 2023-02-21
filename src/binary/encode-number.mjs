import { stat } from './debug-stat.mjs';
import { getIntType } from './encode-get-type.mjs';
import {
    TYPE_UINT_8,
    TYPE_UINT_16,
    TYPE_UINT_24,
    TYPE_UINT_32,
    TYPE_UINT_32_VAR,
    TYPE_NEG_INT,
    ARRAY_ENCODING_DEFAULT,
    ARRAY_ENCODING_PROGRESSION,
    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_VLQ2,
    ARRAY_ENCODING_SIGNED_VLQ,
    ARRAY_ENCODING_SIGNED_VLQ2
} from './const.mjs';

export function minNumArraySliceEncoding(writer, array, start = 0, end = array.length) {
    const arrayLength = end - start;
    let typeIndexBytes = 0;
    let vlqBytes = 0;
    let vlqBytes2 = Math.ceil(arrayLength / 2);
    let vlqSignedBytes = 0;
    let vlqSignedBytes2 = Math.ceil(arrayLength / 2);
    let progressionStep = array[start + 1] - array[start];
    let progressionBytes = Infinity;
    let typeBitmap = 0;
    let typeCount = 0;
    let minN = array[start];

    for (let i = start, prev = 0; i < end; i++) {
        const n = array[i];
        const elemType = getIntType(n);

        if (((typeBitmap >> elemType) & 1) === 0) {
            typeBitmap |= (1 << elemType);
            typeCount++;
        }

        if (n < minN) {
            minN = n;
        }

        if (i !== start && progressionStep !== n - prev) {
            progressionStep = false;
        }

        switch (elemType) {
            case TYPE_UINT_8:
                typeIndexBytes += 1;
                vlqBytes += n > 0x7f ? 2 : 1;
                vlqBytes2 += n > 0x07 ? 1 : 0;
                vlqSignedBytes += n > 0x3f ? 2 : 1;
                vlqSignedBytes2 += n > 0x03 ? 1 : 0;
                break;

            case TYPE_UINT_16:
                typeIndexBytes += 2;
                vlqBytes += n > 0x3fff ? 3 : 2;
                vlqBytes2 += n > 0x03ff ? 2 : 1;
                vlqSignedBytes += n > 0x1fff ? 3 : 2;
                vlqSignedBytes2 += n > 0x01ff ? 2 : 1;
                break;

            case TYPE_UINT_24:
                typeIndexBytes += 3;
                vlqBytes += n > 0x001f_ffff ? 4 : 3;
                vlqBytes2 += n > 0x0001_ffff ? 3 : 2;
                vlqSignedBytes += n > 0x000f_ffff ? 4 : 3;
                vlqSignedBytes2 += n > 0x0000_ffff ? 3 : 2;
                break;

            case TYPE_UINT_32:
                typeIndexBytes += 4;
                vlqBytes += n > 0x0fff_ffff ? 5 : 4;
                vlqBytes2 += n > 0x00ff_ffff ? 4 : 3;
                vlqSignedBytes += n > 0x07ff_ffff ? 5 : 4;
                vlqSignedBytes2 += n > 0x007f_ffff ? 4 : 3;
                break;

            case TYPE_UINT_32_VAR: {
                const vlqn = writer.vlqBytesNeeded(n);
                const nSigned = 2 * n;
                const vlqnSigned = writer.vlqBytesNeeded(nSigned);

                typeIndexBytes += vlqn;
                vlqBytes += vlqn;
                vlqBytes2 += writer.vlqBytesNeeded((n - (n & 0x07)) / 8); // safe ">> 3" for big numbers
                vlqSignedBytes += vlqnSigned;
                vlqSignedBytes2 += writer.vlqBytesNeeded((nSigned - (nSigned & 0x07)) / 8); // safe ">> 2" for big numbers
                break;
            }

            case TYPE_NEG_INT: {
                const nSigned = -2 * n;
                const vlqn = writer.vlqBytesNeeded(nSigned);

                typeIndexBytes += vlqn;
                vlqBytes += Infinity;
                vlqBytes2 += Infinity;
                vlqSignedBytes += vlqn;
                vlqSignedBytes2 += nSigned > 7
                    ? writer.vlqBytesNeeded((nSigned - (nSigned & 0x07)) / 8)  // safe ">> 2" for big numbers
                    : 0;
                break;
            }
        }

        prev = n;
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
    // let minDiffBytes = Infinity;
    // if (typeCount === 1 && !disMin) {
    //     minDiffBytes = writer.vlqBytesNeeded(minN);
    //     for (let i = start; i < end; i++) {
    //         minDiffBytes += writer.vlqBytesNeeded(array[i] - minN);
    //     }
    // }

    // Find the most bytes saving encoding
    let minBytes = typeIndexBytes;
    let encoding = ARRAY_ENCODING_DEFAULT;

    if (progressionBytes < minBytes) {
        encoding = ARRAY_ENCODING_PROGRESSION;
        minBytes = progressionBytes;
    }

    if (vlqBytes < minBytes) {
        encoding = ARRAY_ENCODING_VLQ;
        minBytes = vlqBytes;
    }

    if (vlqBytes2 < minBytes) {
        encoding = ARRAY_ENCODING_VLQ2;
        minBytes = vlqBytes2;
    }

    if (vlqSignedBytes < minBytes) {
        encoding = ARRAY_ENCODING_SIGNED_VLQ;
        minBytes = vlqSignedBytes;
    }

    if (vlqSignedBytes2 < minBytes) {
        encoding = ARRAY_ENCODING_SIGNED_VLQ2;
        minBytes = vlqSignedBytes2;
    }

    return {
        encoding,
        bytes: minBytes
    };
}

export function findNumArrayBestEncoding(writer, array, sectionSize = 32) {
    // const sectionStatTemp = {};
    let { encoding, bytes } = minNumArraySliceEncoding(writer, array);

    return { encoding, bytes };
}
