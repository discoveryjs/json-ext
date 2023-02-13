import { Writer } from './encode-writter.mjs';
import { getType, getTypeCount } from './encode-get-type.mjs';
import { findNumArrayBestEncoding } from './encode-number.mjs';
import { findCommonStringPrefix } from './encode-string.mjs';
import { collectArrayObjectInfo } from './encode-object.mjs';
import {
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

    STORABLE_TYPES,
    ARRAY_NON_WRITABLE_TYPE,
    UINT_TYPE,

    // TYPE_NAME,

    ARRAY_ENCODING_DEFAULT,
    ARRAY_ENCODING_VLQ,
    ARRAY_ENCODING_VLQ2,
    ARRAY_ENCODING_PROGRESSION,
    ARRAY_ENCODING_SINGLE_VALUE,
    ARRAY_ENCODING_ENUM,
    ARRAY_ENCODING_STRING,
    ARRAY_ENCODING_STRING_DEFAULT,

    LOW_BITS_TYPE,
    LOW_BITS_FLAGS
} from './const.mjs';
import { resetStat, stat } from './debug-stat.mjs';

const EMPTY_MAP = new Map();

export function encode(input, options = {}) {
    function writeStringReference(str) {
        const ref = strings.get(str);

        if (ref !== undefined) {
            writer.writeReference(ref);

            return true;
        }

        return false;
    }

    function writeString(value) {
        if (value === '') {
            writer.writeReference(0); // empty string reference
            return;
        }

        if (!writeStringReference(value)) {
            const prevStringCommonPrefixLength = findCommonStringPrefix(prevString, value);
            // const prevStringCommonLength2 = findCommonSubstring2(prevString, value);
            // let start = 0;
            // let end = value.length;

            // if (prevStringCommonLength2 !== 0) {
            //     // end = prevStringCommonLength2;
            //     totaldiff += -prevStringCommonLength2;
            //     taildiff += -prevStringCommonLength2;
            //     if (prevStringCommonLength < -prevStringCommonLength2) {
            //         taildiff2 += -prevStringCommonLength2;
            //     }
            // }

            // totalpenalty += prevStringCommonLength2 !== 0 && prevStringCommonLength !== 0;
            if (prevStringCommonPrefixLength > 0) {
                // start = prevStringCommonLength;
                // totaldiff += prevStringCommonLength;
                // headdiff += prevStringCommonLength;
                // if (prevStringCommonLength > -prevStringCommonLength2) {
                //     headdiff2 += prevStringCommonLength;
                // }
                // penalty += prevStringCommonLength >= 64 && prevStringCommonLength < 128;
                // penalty += prevStringCommonLength <= (vlqBytesNeeded(prevStringCommonLength * 2) + 1);
                writer.writeUint8(0);
                writer.writeVlq(prevStringCommonPrefixLength);
                writer.writeString(value.slice(prevStringCommonPrefixLength), 0);
            } else {
                writer.writeString(value);
            }

            // if (prevStringCommonLength || prevStringCommonLength2) {
            //     writer.writeUint8(0);
            //     if (prevStringCommonLength > -prevStringCommonLength2)  {
            //         start = prevStringCommonLength;
            //         prevStringCommonLength && writer.writeVlq(prevStringCommonLength * 2);
            //     } else {
            //         end = prevStringCommonLength2;
            //         prevStringCommonLength2 && writer.writeVlq(-prevStringCommonLength2 * 2 | 1);
            //     }
            //     writer.writeString(value.slice(start, end), 0);
            // } else {
            //     writer.writeString(value);
            // }

            strings.set(value, stringIdx++);
            prevString = value;
        }
    }

    function writeObject(object, ignoreFields = EMPTY_MAP) {
        let entryIdx = 0;
        objects++;

        for (const key in object) {
            if (hasOwnProperty.call(object, key) && !ignoreFields.has(key)) {
                const entryValue = object[key];

                if (entryValue === undefined) {
                    continue;
                }

                const entryType = getType(entryValue);
                let keyId = objectKeys.get(key);

                if (keyId === undefined) {
                    objectKeys.set(key, keyId = objectKeys.size);
                }

                if (entryIdx >= objectEntryDefs.length) {
                    objectEntryDefs[entryIdx] = new Map();
                }

                const defId = (keyId << 4) | entryType;
                const refId = objectEntryDefs[entryIdx].get(defId);

                if (refId !== undefined) {
                    // def reference
                    writer.writeReference(refId);
                } else {
                    writer.writeVlq(2);
                    writeString(key);
                    writer.writeUint8(entryType);
                    objectEntryDefs[entryIdx].set(defId, objectEntryDefs[entryIdx].size);
                }

                writeTypedValue(entryType, object[key]);
                entryIdx++;
            }
        }

        writer.writeUint8(0);
    }

    function writeArray(array, knownLength = false, column = null) {
        // an empty array
        if (array.length === 0) {
            writer.writeUint8(0);
            return;
        }

        // collect array element types
        let elemTypes = null;
        let typeBitmap = 0;
        let typeCount = 0;
        let encoding = ARRAY_ENCODING_DEFAULT;
        let values = null;

        if (column !== null) {
            elemTypes = column.types;
            typeBitmap = column.typeBitmap;
            typeCount = column.typeCount;
        } else {
            for (let i = 0; i < array.length; i++) {
                const elem = array[i];
                const elemType = elem === undefined
                    ? TYPE_NULL
                    : getType(elem);
                const elemTypeBit = 1 << elemType;

                if ((typeBitmap & elemTypeBit) === 0) {
                    if (typeCount === 1) {
                        elemTypes = new Uint8Array(array.length).fill(31 - Math.clz32(typeBitmap), 0, i);
                    }

                    typeCount++;
                    typeBitmap |= elemTypeBit;
                }

                if (typeCount > 1) {
                    elemTypes[i] = elemType;
                }
            }
        }

        let stringHeaders = null;

        if ((typeBitmap & (1 << TYPE_STRING)) === typeBitmap && array.length > 2) {
            const sectionSize = 32;
            let stringIdx_ = stringIdx;
            let prevString_ = prevString;
            const tmpStrings = new Map();
            let current = 0;
            let hasSlice = false;
            let sliceBitLoss = 0;
            let refs = 0;

            stringHeaders = new Array(array.length);
            for (let i = 0, k = 0; i < array.length; i++) {
                const str = array[i];
                const refIdx = str === '' ? 0 : strings.get(str) || tmpStrings.get(str);

                if (refIdx === undefined) {
                    const prevStringCommonPrefixLength = findCommonStringPrefix(prevString_, str);
                    let bytes;

                    tmpStrings.set(str, stringIdx_++);
                    prevString_ = str;

                    if (prevStringCommonPrefixLength > 0) {
                        bytes = Buffer.byteLength(str.slice(prevStringCommonPrefixLength));
                        // console.log('!slice', { offset: prevStringCommonPrefixLength, len: bytes }, prevString_.slice(0, prevStringCommonPrefixLength), str.slice(prevStringCommonPrefixLength));
                        current += 1 +
                            writer.vlqBytesNeeded(bytes) +
                            writer.vlqBytesNeeded(prevStringCommonPrefixLength);
                    } else {
                        bytes = Buffer.byteLength(str);
                        // console.log('!raw', { len: bytes }, str);
                        current += writer.vlqBytesNeeded(bytes << 1);
                    }

                    stringHeaders[k++] = (bytes << 2) | (prevStringCommonPrefixLength > 0 ? 0b10 : 0);
                    sliceBitLoss += writer.vlqBytesNeeded(bytes << 2) - writer.vlqBytesNeeded(bytes << 1);

                    if (prevStringCommonPrefixLength > 0) {
                        hasSlice = true;
                        stringHeaders[k++] = prevStringCommonPrefixLength;
                    }
                } else {
                    // console.log('!ref', refIdx, str);
                    current += writer.vlqBytesNeeded(refIdx << 1);
                    stringHeaders[k++] = (refIdx << 1) | 1;
                    refs++;
                }
            }
            const { bytes: lengthBytes } = findNumArrayBestEncoding(writer, stringHeaders, sectionSize);

            if (!hasSlice) {
                stat.sliceBitLoss += sliceBitLoss;
                stat.noSliceStringArray++;
                stat.noSliceStringArrayLenBytes += writer.vlqBytesNeeded(array.length);
            }

            if (refs === array.length) {
                stat.onlyStrRefsLoss += stringHeaders.reduce((s, v) => s + writer.vlqBytesNeeded(v) - writer.vlqBytesNeeded(v >> 1), 0);
            } else if (refs === 0) {
                if (!hasSlice) {
                    stat.onlyStrDefLoss += stringHeaders.reduce((s, v) => s + writer.vlqBytesNeeded(v) - writer.vlqBytesNeeded(v >> 2), 0);
                } else {
                    stat.onlyStrDefAndSliceLoss = stringHeaders.reduce((s, v) => s + writer.vlqBytesNeeded(v) - writer.vlqBytesNeeded(v >> 1), 0);
                }
            }

            // console.log(array, {lns, prefixes, lengthBytes, prefixesBytes});

            if (lengthBytes + 1 < current) {
                // console.log({new: lengthBytes + 1, current });
                encoding = ARRAY_ENCODING_STRING;
                stat.newStringBytes += lengthBytes + 1;
                stat.currentStringBytes += current;
            } else {
                encoding = ARRAY_ENCODING_STRING_DEFAULT;
                stat.loosnewStringBytes += lengthBytes + 1;
                stat.looscurrentStringBytes += current;
            }

            // const min1 = Math.min(...Object.values(estimates));
            // const min2 = Math.min(...Object.values(estimatesDeltas));
            // const min = Math.min(min1, min2);
            // const estimatesMin = min1 <= min2 ? estimates : estimatesDeltas;

            // for (const [k,v] of Object.entries({ current, ...estimatesMin })) {
            //     if (v === min) {
            //         const kx = min1 <= min2 ? k : k + '_delta';
            //         arrayStrStat[kx] = arrayStrStat[kx] || { size: 0, indexSize: 0, count: 0 };
            //         arrayStrStat[kx].count++;
            //         arrayStrStat[kx].size += v;
            //         arrayStrStat[kx].indexSize += current;
            //         break;
            //     }
            // }
            // pontStrIndex += current;
            // pontStrMin += min;

            // if (current > min) {
            //     enc = 1;
            // }
        }

        // try to optimize array of uint values only
        const sectionSize = 16;
        if (encoding === ARRAY_ENCODING_DEFAULT && (typeBitmap & UINT_TYPE) === typeBitmap && array.length > 1) {
            let bytes = 0;
            // const t = performance.now();
            stat.enabled = true;
            ({ encoding, bytes } = findNumArrayBestEncoding(writer, array, sectionSize));
            stat.enabled = false;
            // const { estimates, sectionStatTemp, estimatesDeltas } = findNumArrayBestEncoding(array, elemTypes, sectionSize);
            // let even = 0;
            // let even2 = 0;
            // for (let i = 0; i < array.length; i++) {
            //     if ((array[i] & 1) === 0) {
            //         even++;
            //         even2 += array[i] > 0 && (((32 - Math.clz32(array[i])) - 1) % 8) === 0;
            //     }
            // }
            // arrayNumEven += even === array.length;
            // arrayNumEven2 += even === array.length ? even2 : 0;
            // arrayNumOdd += even === 0;

            // const min1 = Math.min(...Object.values(estimates));
            // const min2 = Math.min(...Object.values(estimatesDeltas));
            // const min = Math.min(min1, min2);
            // const estimatesMin = min1 <= min2 ? estimates : estimatesDeltas;
            // let idx = 0;

            // for (const [k,v] of Object.entries(estimatesMin)) {
            //     if (v === min) {
            //         const kx = min1 <= min2 ? k : k + '_delta';
            //         arrayStat[kx] = arrayStat[kx] || { size: 0, indexSize: 0, count: 0 };
            //         arrayStat[kx].count++;
            //         arrayStat[kx].size += v;
            //         arrayStat[kx].indexSize += estimates.indexBytes;
            //         enc = idx | (min1 > min2 ? 1 << 4 : 0);

            //         if (k === 'sections') {
            //             for (const [k2,v2] of Object.entries(sectionStatTemp)) {
            //                 const kx2 = k2;
            //                 if (sectionsStat[kx2]) {
            //                     sectionsStat[kx2].count += v2.count;
            //                     sectionsStat[kx2].size += v2.size;
            //                     sectionsStat[kx2].indexSize += v2.indexSize;
            //                 } else {
            //                     sectionsStat[kx2] = v2;
            //                 }
            //             }
            //         }
            //         break;
            //     }
            //     idx++;
            // }

            // pontIndex += estimates.indexBytes;
            // pontMin += min;

            // if (estimates.indexBytes > min) {
            //     enc = 1;
            // }
            // if (array.length > 1_000_000) {
            //     console.log({ len: array.length, vlqBytes, vlqBytes2, indexBytes });
            // }

            // tt += performance.now() - t;
        }

        // try to apply column representation for objects
        const {
            objectKeyColumns,
            hasInlinedObjectKeys
        } = collectArrayObjectInfo(array, elemTypes, typeBitmap);

        // array header
        // =====================
        //
        //  [header-prelude]? [type-list | type-bitmap]? [encoding]
        //   ─┬────────────    ─┬─────────────────────   ──┬───────
        //    └ 1 byte          └ 1-2 bytes                └ 1 byte
        //
        //
        // encoding byte
        // aa bbbb xx
        // ─┬ ─┬── ─┬
        //  │  │    └ ??
        //  │  └ encoding (depends on type bitmap)
        //  └ lowering type: none, delta, min-delta, ...?
        //
        // Encoding:
        //
        //   7 65 4 3210
        //   ─ ── ─ ────
        //   a bb c dddd
        //   ┬ ─┬ ┬ ─┬──
        //   │  │ │  └ lowBitsType (lowBitsKind=0) or lowBitsFlags (lowBitsKind=1)
        //   │  │ └ lowBitsKind
        //   │  └ extraTypesBits
        //   └ hasUndef
        //
        // (b) extraTypesBits:
        //   00 – no extra bytes
        //   01 – list of types (1 byte = 2 types)
        //   10 – bitmap 1 byte
        //   11 – bitmap 2 bytes
        //
        // (c) lowBitsKind:
        //   0 – type (highest bit in typeBitmap)
        //   1 – flags
        //
        // (d) lowBitsFlags:
        //   x xx 1 e f g h
        //          ┬ ┬ ┬ ┬
        //          │ │ │ └ hasNulls (TYPE_NULL is used, omitted in a type list/bitmap)
        //          │ │ └ encodedArrays (TYPE_ARRAY is used, omitted in a type list/bitmap)
        //          │ └ hasObjectInlineKeys (TYPE_OBJECT is used, omitted in a type list/bitmap)
        //          └ hasObjectColumnKeys (TYPE_OBJECT is used, omitted in a type list/bitmap)
        //
        // special cases:
        //   1) 0 xx 0 xxxx
        //             ─┬──
        //              └ TYPE_OBJECT or TYPE_NULL or TYPE_ARRAY? - can be reserved for a special cases
        //                since having these types can be represented with "0 00 1 flags" notation
        //
        //   2) 0 01 0 xxxx
        //        ┬─   ─┬──
        //        │     └ type0
        //        └ 1 extra byte for 1-2 extra types:
        //            1 type  -> type byte: type1 | type1
        //            2 types -> type byte: type2 | type1
        //
        //   3) 0 01 1 xxxx
        //        ┬─   ─┬──
        //        │     └ flags
        //        └ 1 extra byte for 1-2 types:
        //            1 type  -> type byte: type0 | type0
        //            2 types -> type byte: type1 | type0
        //
        arrays++;
        const hasUndef = (typeBitmap >> TYPE_UNDEF) & 1;
        const hasNulls = (typeBitmap >> TYPE_NULL) & 1;
        const hasFlattenArrays = (typeBitmap >> TYPE_ARRAY) & 1
            ? (typeCount === 1) || getTypeCount(elemTypes, TYPE_ARRAY) > 1
            : 0;
        const hasObjectColumnKeys = objectKeyColumns.size !== 0;
        const lowBitsFlags =
            (hasObjectColumnKeys << 3) |
            (hasInlinedObjectKeys << 2) |
            (hasFlattenArrays << 1) |
            (hasNulls << 0);
        const lowBitsKind = lowBitsFlags !== 0 || (typeCount === 1 && hasUndef) // has any flag or all elements are undefined (an object key column)
            ? LOW_BITS_FLAGS // flags
            : LOW_BITS_TYPE; // type
        const lowBitsType = lowBitsKind === LOW_BITS_TYPE
            ? 31 - Math.clz32(typeBitmap & STORABLE_TYPES)
            : 0;
        const headerTypeBitmap =
            typeBitmap & (STORABLE_TYPES ^ // switch off type bits used in lowBitsFlags
                (lowBitsKind === LOW_BITS_TYPE ? 1 << lowBitsType : 0) ^
                ((hasObjectColumnKeys || hasInlinedObjectKeys) << TYPE_OBJECT) ^
                (hasFlattenArrays << TYPE_ARRAY) ^
                (hasNulls << TYPE_NULL)
            );
        const extraTypeCount = typeCount - hasUndef - (
            lowBitsKind === LOW_BITS_TYPE
                ? 1
                : (hasObjectColumnKeys || hasInlinedObjectKeys) + hasFlattenArrays + hasNulls
        );
        const extraTypesBits =
            extraTypeCount <= 0
                ? 0b00 // no extra bytes
                : extraTypeCount <= 2
                    ? 0b01 // list of types, 1 byte for extra 1-2 types
                    : headerTypeBitmap <= 0xff
                        ? 0b10  // bitmap, 1 byte
                        : 0b11; // bitmap, 2 bytes

        // write header
        const header =
            // a
            (hasUndef << 7) |
            // bb
            (extraTypesBits << 5) |
            // c
            (lowBitsKind << 4) |
            // dddd
            (lowBitsKind === LOW_BITS_TYPE ? lowBitsType : lowBitsFlags);

        const arrayHeader = (encoding << 24) | (headerTypeBitmap << 8) | header;
        const arrayHeaderId = arrayDefs.get(arrayHeader);

        // const xxTypeBitmap = typeBitmap | (hasInlinedObjectKeys << 18) | (hasObjectColumnKeys << 19);
        // typeBitmaps.set(xxTypeBitmap, (typeBitmaps.get(xxTypeBitmap) || 0) + 1);
        // typeBitmapsValues.set(xxTypeBitmap, (typeBitmapsValues.get(xxTypeBitmap) || 0) + array.length);
        // xHeaders.add((typeBitmap << 7) | (hasObjectColumnKeys << 6) | (hasInlinedObjectKeys << 5) | enc);

        // cdefs++;
        // cdefsBytes += 1 + (extraTypesBits === 0 ? 1 : extraTypesBits === 3 ? 3 : 2);

        // const byte2str = (b) => b.toString(2).padStart(8, 0);
        // console.log(
        //     'header:', byte2str(header),
        //     'typeBitmap:', byte2str(typeBitmap & 0xff), byte2str(typeBitmap >> 8)
        //     'headerTypeBitmap:', byte2str(headerTypeBitmap & 0xff), byte2str(headerTypeBitmap >> 8)
        //     'columns:', [...objectColumnKeys.keys()],
        //     value
        // );

        if (!knownLength) {
            writer.writeVlq(array.length);
        }

        if (arrayHeaderId !== undefined) {
            writer.writeVlq((arrayHeaderId << 1) | 1);
        } else {
            arrayDefs.set(arrayHeader, arrayDefs.size);

            writer.writeVlq((encoding << 1) | 0);
            writer.writeUint8(header);

            // extra types
            switch (extraTypesBits) {
                case 0b01: {
                    const type1 = 31 - Math.clz32(headerTypeBitmap);
                    const type2 = 31 - Math.clz32(headerTypeBitmap ^ (1 << type1));

                    writer.writeUint8(
                        type2 === -1
                            ? (type1 << 4) | type1
                            : (type2 << 4) | type1
                    );

                    break;
                }

                case 0b10:
                    writer.writeUint8(headerTypeBitmap);
                    break;

                case 0b11:
                    writer.writeUint16(headerTypeBitmap);
                    break;
            }
        }

        // let written = writer.written;

        switch (encoding) {
            case ARRAY_ENCODING_SINGLE_VALUE:
                writer.writeUint8(elemTypes[0]);
                writeTypedValue(elemTypes[0], array[0]);
                break;

            case ARRAY_ENCODING_ENUM: {
                const map = new Map();

                if (typeBitmap & (1 << TYPE_TRUE)) {
                    map.set(true, map.size);
                }
                if (typeBitmap & (1 << TYPE_FALSE)) {
                    map.set(false, map.size);
                }
                if (typeBitmap & (1 << TYPE_NULL)) {
                    map.set(null, map.size);
                }
                if (typeBitmap & (1 << TYPE_UNDEF)) {
                    map.set(undefined, map.size);
                }
                for (const val of values) {
                    map.set(val, map.size);
                }

                const bitsPerValue = 32 - Math.clz32((values.size + typeCount) - 1);
                let shift = 0;
                let chunk = 0;

                for (let i = 0, maxRef = map.size - values.size; i < array.length; i++) {
                    let x = map.get(array[i]);

                    if (x > maxRef) {
                        maxRef++;
                        x = getType(array[i]);
                    }

                    chunk |= x << shift;
                    shift += bitsPerValue;

                    if (shift >= 8) {
                        writer.writeUint8(chunk);
                        shift -= 8;
                        chunk >>= 8;
                    }
                }

                if (shift > 0) {
                    writer.writeUint8(chunk);
                }

                for (const val of values) {
                    writeTypedValue(getType(val), val);
                }
                break;
            }

            case ARRAY_ENCODING_VLQ: {
                // write values
                for (let i = 0; i < array.length; i++) {
                    writer.writeUintVar(array[i]);
                }
                break;
            }

            case ARRAY_ENCODING_VLQ2: {
                // const t = performance.now();
                // write index
                for (let i = 0; i < array.length; i += 2) {
                    writer.writeUint8(
                        (array[i] > 0x07 ? 0x08 : 0x00) | (array[i] & 0x07) |
                        (array[i + 1] > 0x07 ? 0x80 : 0x00) | ((array[i + 1] & 0x07) << 4)
                    );
                }

                // write values
                for (let i = 0; i < array.length; i++) {
                    if (array[i] > 0x07) {
                        writer.writeUintVar((array[i] - (array[i] & 0x07)) / 8);
                    }
                }

                // tt += performance.now() - t;
                break;
            }

            case ARRAY_ENCODING_PROGRESSION: {
                // const w = writer.written;
                writer.writeUintVar(array[0]);
                // const w1 = writer.written - w;
                writer.writeSignedVlq(array[1] - array[0]);

                // const ww = writer.written - w;
                // encodeWritten += ww;
                // console.log(array[0], array[1] - array[0], ww, w1, ww-w1);
                break;
            }

            case ARRAY_ENCODING_STRING_DEFAULT: {
                for (let i = 0, k = 0; i < array.length; i++) {
                    const header = stringHeaders[k++];

                    if (header & 1) {
                        writer.writeVlq(header);
                    } else {
                        const str = array[i];

                        if (header & 0b10) {
                            const offset = stringHeaders[k++];
                            writer.writeUint8(0);
                            writer.writeVlq(offset);
                            writer.writeString(str.slice(offset), 0);
                        } else {
                            writer.writeString(str);
                        }

                        strings.set(str, stringIdx++);
                        prevString = str;
                    }
                }
                break;
            }

            case ARRAY_ENCODING_STRING: {
                writeArray(stringHeaders);

                for (let i = 0, k = 0; i < array.length; i++) {
                    const header = stringHeaders[k++];

                    if ((header & 1) === 0) {
                        // string definition
                        const str = array[i];

                        writer.writeStringBytes(header & 0b10
                            // prefix slice
                            ? str.slice(stringHeaders[k++])
                            // raw string
                            : str
                        );

                        strings.set(str, stringIdx++);
                        prevString = str;
                    }
                }

                break;
            }

            default:
                // write array's element values depending on type's number
                if (typeCount > 1) {
                    // an array with multi-type values
                    writer.writeTypeIndex(elemTypes, typeBitmap);

                    // write elements
                    if ((typeBitmap & ARRAY_NON_WRITABLE_TYPE) !== typeBitmap || ((typeBitmap & (1 << TYPE_ARRAY)) && !hasFlattenArrays)) {
                        for (let i = 0; i < array.length; i++) {
                            const elemType = elemTypes[i];

                            if (((1 << elemType) & ARRAY_NON_WRITABLE_TYPE) === 0 || (elemType === TYPE_ARRAY && !hasFlattenArrays)) {
                                writeTypedValue(elemType, array[i]);
                            }
                        }
                    }
                } else {
                    // an array with a single type
                    if ((typeBitmap & ARRAY_NON_WRITABLE_TYPE) !== typeBitmap || ((typeBitmap & (1 << TYPE_ARRAY)) && !hasFlattenArrays)) {
                        const writeValue = typeWriteHandler[31 - Math.clz32(typeBitmap)];

                        for (const elem of array) {
                            writeValue(elem);
                        }
                    }
                }

                if (hasFlattenArrays) {
                    const arrays = typeCount > 1
                        ? array.filter(Array.isArray)
                        : array;

                    writeArray(arrays.map(array => array.length), true);
                    writeArray(arrays.flat());
                }

                // write object column keys
                if (hasObjectColumnKeys) {
                    // write column keys
                    writer.writeVlq(objectKeyColumns.size);
                    for (const key of objectKeyColumns.keys()) {
                        writeString(key);
                    }

                    // write column values
                    for (const column of objectKeyColumns.values()) {
                        writeArray(column.values, true, column);
                    }
                }

                // write object inlined keys
                if (hasInlinedObjectKeys) {
                    const objectsOnly = typeBitmap === (1 << TYPE_OBJECT);

                    for (let i = 0; i < array.length; i++) {
                        if (objectsOnly || elemTypes[i] === TYPE_OBJECT) {
                            writeObject(array[i], objectKeyColumns);
                        }
                    }
                }
        }

        // if (typeCount === 1 && (typeBitmap & ((1 << TYPE_ARRAY) | (1 << TYPE_UNDEF)))) {
        //     let ok = true;
        //     loop: for (const elem of array) {
        //         if (Array.isArray(elem)) {
        //             for (const x of elem) {
        //                 if (typeof x !== 'number' || !isFinite(x)) {
        //                     ok = false;
        //                     break loop;
        //                 }
        //             }
        //         }
        //     }

        //     if (ok) {
        //         const arrays = array.filter(Array.isArray);
        //         const values = arrays.flat();
        //         const alens = arrays.map(x => x.length);
        //         const { estimates, estimatesDeltas } = findNumArrayBestEncoding(values, getElemenTypes(values), sectionSize);
        //         const lens = findNumArrayBestEncoding(alens, getElemenTypes(alens), sectionSize);
        //         const current = writer.written - written;
        //         estimates.current = current;
        //         estimatesDeltas.current = current;

        //         const minLen = Math.min(...Object.values(lens.estimates), ...Object.values(lens.estimatesDeltas));
        //         const min1 = Math.min(...Object.values(estimates));
        //         const min2 = Math.min(...Object.values(estimatesDeltas));
        //         const min = Math.min(min1, min2);
        //         const estimatesMin = min1 <= min2 ? estimates : estimatesDeltas;

        //         for (const [k,v] of Object.entries({ current, ...estimatesMin })) {
        //             if (v === min) {
        //                 const kx = min1 <= min2 ? k : k + '_delta';
        //                 arrayArrStat[kx] = arrayArrStat[kx] || { size: 0, indexSize: 0, lens: 0, count: 0 };
        //                 arrayArrStat[kx].count++;
        //                 // arrayArrStat[kx].lens += minLen;
        //                 arrayArrStat[kx].size += v + minLen;
        //                 arrayArrStat[kx].indexSize += current;
        //                 break;
        //             }
        //         }

        //         pontArrIndex += current;
        //         pontArrMin += min;
        //     }
        // }

        // console.log(writer.written - written);
    }

    function writeTypedValue(elemType, value) {
        switch (elemType) {
            case TYPE_STRING:      typeWriteHandler[elemType](value); break;
            case TYPE_UINT_8:      typeWriteHandler[elemType](value); break;
            case TYPE_UINT_16:     typeWriteHandler[elemType](value); break;
            case TYPE_UINT_24:     typeWriteHandler[elemType](value); break;
            case TYPE_UINT_32:     typeWriteHandler[elemType](value); break;
            case TYPE_UINT_32_VAR: typeWriteHandler[elemType](value); break;
            case TYPE_NEG_INT:     typeWriteHandler[elemType](value); break;
            case TYPE_FLOAT_32:    typeWriteHandler[elemType](value); break;
            case TYPE_FLOAT_64:    typeWriteHandler[elemType](value); break;
            case TYPE_OBJECT:      typeWriteHandler[elemType](value); break;
            case TYPE_ARRAY:       typeWriteHandler[elemType](value); break;
        }
    }

    const writer = new Writer(options.chunkSize);
    const objectKeys = new Map();
    const objectEntryDefs = [];
    const arrayDefs = new Map();
    const strings = new Map();
    let prevString = '';
    let stringIdx = 1;
    const inputType = getType(input);

    const noop = () => {};
    const typeWriteHandler = {
        [TYPE_TRUE]: noop,
        [TYPE_FALSE]: noop,
        [TYPE_NULL]: noop,
        [TYPE_UNDEF]: noop,
        [TYPE_STRING]: writeString,
        [TYPE_UINT_8]: writer.writeUint8.bind(writer),
        [TYPE_UINT_16]: writer.writeUint16.bind(writer),
        [TYPE_UINT_24]: writer.writeUint24.bind(writer),
        [TYPE_UINT_32]: writer.writeUint32.bind(writer),
        [TYPE_UINT_32_VAR]: writer.writeUintVar.bind(writer),
        [TYPE_NEG_INT]: (value) => writer.writeUintVar(-value),
        [TYPE_FLOAT_32]: writer.writeFloat32.bind(writer),
        [TYPE_FLOAT_64]: writer.writeFloat64.bind(writer),
        [TYPE_OBJECT]: writeObject,
        [TYPE_ARRAY]: writeArray
    };

    let arrays = 0;
    let objects = 0;
    let arrays32 = 0;
    let arrayLens = new Map();
    let arrayHasUndef = 0;
    let pontEncoding = 0;
    let pontSections = 0;
    let pontSectionsIndex = 0;
    let pontSectionsPenalty = 0;
    let pontVlq4 = 0;
    let pontVlq4Index = 0;
    let pontOthers = 0;
    let pontEnums = 0;
    let pontIndex = 0;
    let pontMin = 0;
    let pontStrIndex = 0;
    let pontStrMin = 0;
    let pontArrIndex = 0;
    let pontArrMin = 0;
    let pontProgression = 0;
    let pontProgressionIndex = 0;
    let sectionsProgression = 0;
    let totaldiff = 0;
    let taildiff = 0;
    let taildiff2 = 0;
    let headdiff = 0;
    let headdiff2 = 0;
    let penalty = 0;
    let totalpenalty = 0;
    const sectionsStat = {};
    const arrayStat = {};
    const arrayStrStat = {};
    const arrayArrStat = {};
    const refs = new Set();
    const typeBitmaps = new Map();
    const typeBitmapsValues = new Map();
    let sm = 0;
    let smp = 0;
    let progressionSaving = 0;
    let arrayNumEven = 0;
    let arrayNumEven2 = 0;
    let arrayNumOdd = 0;
    let cdefs = 0;
    let cdefsBytes = 0;
    let xHeaders = new Set();

    let encodeWritten = 0;

    resetStat();

    writer.writeUint8(inputType);
    typeWriteHandler[inputType](input);

    // const xStat = (stat) => {
    //     for (const v of Object.values(stat)) {
    //         v.win = v.indexSize - v.size;
    //     }
    //     return stat;
    // };
    // console.log('arrayStrStat', xStat(arrayStrStat));
    // console.log('arrayArrStat', xStat(arrayArrStat));
    // console.log('arrayStat', xStat(arrayStat));
    // console.log('sectionsStat', xStat(sectionsStat));
    // console.log({
    //     pontIndex,
    //     pontSectionsPenalty,
    //     pontOthers,
    //     pontMin,
    //     win: pontIndex - pontMin,
    //     winSections: arrayStat.sections?.win || 0,
    //     winProgression: arrayStat.progressionBytes?.win || 0,
    //     pontArrIndex,
    //     pontArrMin,
    //     winArr: pontArrIndex - pontArrMin,
    //     pontStrIndex,
    //     pontStrMin,
    //     winStr: pontStrIndex - pontStrMin,
    //     winWithStr: (pontIndex - pontMin) + (pontStrIndex - pontStrMin)
    // });

    // const bitmapToNames = b => {
    //     let res = [];
    //     while (b) {
    //         res.unshift(TYPE_NAME[31 - Math.clz32(b)]);
    //         b ^= 1 << (31 - Math.clz32(b));
    //     }
    //     return res;
    // };

    // // console.log(bitmapToNames(1 << TYPE_STRING));

    // console.log({
    //     bitmaps: typeBitmaps.size,
    //     mostpop: [...typeBitmaps.entries()]
    //         .sort((a, b) => b[1] - a[1])
    //         .slice(0, 20)
    //         .map(b => `${b[1]} x ${bitmapToNames(b[0]).join(' | ')} (${typeBitmapsValues.get(b[0])})`)
    // });
    // // console.log({ headdiff, headdiff2, taildiff, taildiff2, total: taildiff2 + headdiff2, totaldiff, penalty, totalpenalty, win: (totaldiff - totalpenalty) - (taildiff2 + headdiff2), winCur: (totaldiff - totalpenalty) - headdiff });
    // // console.log({ strings: strings.size, refs: refs.size, ref8,
    // //     ref8vlq,
    // //     ref16,
    // //     ref16vlq,ref24, ref24vlq });
    // console.log({ sm, smp, arrays, arrayNumEven, arrayNumEven2,
    //     arrayNumOdd, cdefs, cdefsBytes, xHeaders: xHeaders.size, arrayHeaders: arrayHeaders.size });
    // console.log({ columnMonoType, columnMonoTypeElements, acceptedColumns,
    //     droppedColumns });
    // console.log(tt, { pontEnum, pontSV, pontEncoding, pontWat, ponts: pontEnum + pontSV, pont_, pont3 });
    // console.log({min:writer.sb+objects+arrays, pont: writer.written - (writer.sb+objects+arrays) })
    // console.log({ arrays, arrays32, arrays32plus: arrays - arrays32, arrayLens: new Map([...arrayLens.entries()].sort((a, b) => a[0] - b[0]).slice(0, 32)), arrayHasUndef });
    // const {
    //     encodeSize,
    //     encodeCount,
    //     encodeMin,
    //     encodeWin,
    //     encodeDefault,
    //     encodeWinDefault
    // } = stat;
    // console.log({
    //     encodeSize,
    //     encodeCount,
    //     encodeMin,
    //     encodeWin,
    //     encodeDefault,
    //     encodeWinDefault
    // });

    // const {newStringBytes,currentStringBytes,
    //     loosnewStringBytes,
    //     looscurrentStringBytes } = stat;
    // console.log({newStringBytes, currentStringBytes, win: currentStringBytes - newStringBytes,
    //     loosnewStringBytes,
    //     looscurrentStringBytes,
    //     loss: loosnewStringBytes - looscurrentStringBytes});
    // console.log('slice loss', {
    //     bitloss: stat.sliceBitLoss,
    //     noSliceStringArray: stat.noSliceStringArray,
    //     noSliceStringArrayLenBytes: stat.noSliceStringArrayLenBytes,
    //     onlyStrRefsLoss: stat.onlyStrRefsLoss,
    //     onlyStrDefLoss: stat.onlyStrDefLoss,
    //     onlyStrDefAndSliceLoss: stat.onlyStrDefAndSliceLoss
    // });

    const res = writer.value;
    // res.estSize = res.byteLength - (pontIndex - pontMin) - (pontStrIndex - pontStrMin) - (pontArrIndex - pontArrMin) - sm;

    return res;
}
