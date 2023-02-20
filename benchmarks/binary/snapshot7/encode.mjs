import { Writer } from './encode-writter.mjs';
import { getType, getTypeCount } from './encode-get-type.mjs';
import { findNumArrayBestEncoding } from './encode-number.mjs';
import { writeStrings } from './encode-string.mjs';
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

    LOW_BITS_TYPE,
    LOW_BITS_FLAGS
} from './const.mjs';

const EMPTY_MAP = new Map();

export function encode(input, options = {}) {
    function writeString(str) {
        let ref = strings.get(str);

        if (ref === undefined) {
            ref = stringIdx++;
            strings.set(str, ref);
        }

        stringRefs.push(ref);
    }

    function writeObject(object, ignoreFields = EMPTY_MAP) {
        let entryIdx = 0;

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
                    // console.log('! write entry ref', refId);
                    // def reference
                    writer.writeReference(refId);
                } else {
                    writer.writeVlq(2);
                    writeString(key);
                    writer.writeUint8(entryType);
                    objectEntryDefs[entryIdx].set(defId, objectEntryDefs[entryIdx].size);
                    // console.log('! write entry def', defId, objectEntryDefs[entryIdx].size - 1, key, entryType);
                }

                // console.log('! write entry value', entryType, object[key]);
                writeTypedValue(entryType, object[key]);
                entryIdx++;
            }
        }

        writer.writeUint8(0);
    }

    function writeArray(array, knownLength = false, column = null, headerRefs = true) {
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

        // try to optimize array of uint values only
        const sectionSize = 16;
        if (encoding === ARRAY_ENCODING_DEFAULT && (typeBitmap & UINT_TYPE) === typeBitmap && array.length > 1) {
            ({ encoding } = findNumArrayBestEncoding(writer, array, sectionSize));
        }

        // try to apply column representation for objects
        const {
            hasInlinedEntries: objectHasInlinedEntries,
            columns: objectColumns
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
        const hasUndef = (typeBitmap >> TYPE_UNDEF) & 1;
        const hasNulls = (typeBitmap >> TYPE_NULL) & 1;
        const hasFlattenArrays = 0 // (typeBitmap >> TYPE_ARRAY) & 1
            ? ((typeCount === 1) || getTypeCount(elemTypes, TYPE_ARRAY) > 1) &&
                // don't flatten arrays of object arrays for now
                array.every(elem => !Array.isArray(elem) || elem.every(elem2 => getType(elem2) !== TYPE_OBJECT))
            : 0;
        const hasObjectColumnKeys = objectColumns.size !== 0;
        const lowBitsFlags =
            (hasObjectColumnKeys << 3) |
            (objectHasInlinedEntries << 2) |
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
                ((hasObjectColumnKeys || objectHasInlinedEntries) << TYPE_OBJECT) ^
                (hasFlattenArrays << TYPE_ARRAY) ^
                (hasNulls << TYPE_NULL)
            );
        const extraTypeCount = typeCount - hasUndef - (
            lowBitsKind === LOW_BITS_TYPE
                ? 1
                : (hasObjectColumnKeys || objectHasInlinedEntries) + hasFlattenArrays + hasNulls
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
        const arrayHeaderId = headerRefs ? arrayDefs.get(arrayHeader) : undefined;

        // xxxx undefined (hole) / null / true / false
        // xxxx number uint | int | float | numeric bitmap/encoding
        // x string
        // xx object (00 - no, 01 - inlined, 10 - columns, 11 - inlined & columns)
        // xx array (00 - no, 01 - as is, 10 - flatten, 11 - ?)
        // x carry bit
        // x ref/def bit
        // x reserved

        // 1
        // xxxxxxxx types
        // 2
        // xx object  inlined | columns
        // x array  (0 as is, 1 - flatten)
        // xx string?  refs | defs | slice
        // xxx number  uint/int | float | bitmap
        // 3 num encoding
        // xx lowering
        // xxxxxx encoding
        //  - progression
        //  - vlq
        //  - vlq_signed
        //  - vlq2
        //  - vlq2_signed
        //  - enum
        //  - sections
        // 3 bitmap
        // xxxxx - uint/int 8, 16, 24, 32, 32vlq
        // xxx - float32, float64, decimal
        //
        // ----
        //
        // uint: uint8, uint16, uint24, uint32, uint32Vlq, uintVlq
        // int_neg: int8, int16, int24, int32, int32Vlq, intVlq
        // float: float32, float64, decimal  ? decimal8, decimal16, decimal24, decimal32, decimalVlq

        // const xxTypeBitmap = typeBitmap | (hasInlinedObjectKeys << 18) | (hasObjectColumnKeys << 19);
        // typeBitmaps.set(xxTypeBitmap, (typeBitmaps.get(xxTypeBitmap) || 0) + 1);
        // typeBitmapsValues.set(xxTypeBitmap, (typeBitmapsValues.get(xxTypeBitmap) || 0) + array.length);

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

        // let written = writer.written;

        if (!knownLength) {
            writer.writeVlq(array.length);
        }

        if (arrayHeaderId !== undefined) {
            writer.writeVlq((arrayHeaderId << 1) | 1);
        } else {
            if (headerRefs) {
                arrayDefs.set(arrayHeader, arrayDefs.size);
            }

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

        // console.log('array', array, 'header', writer.written - written, 'enc', encoding);
        // written = writer.written;

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
                    writer.writeVlq(objectColumns.size);
                    for (const key of objectColumns.keys()) {
                        writeString(key);
                    }

                    // write column values
                    for (const column of objectColumns.values()) {
                        // array.length > 100 && console.log(column.key, array.length);
                        writeArray(column.values, true, column);
                    }
                }

                // write object inlined keys
                if (objectHasInlinedEntries) {
                    const objectsOnly = typeBitmap === (1 << TYPE_OBJECT);

                    for (let i = 0; i < array.length; i++) {
                        if (objectsOnly || elemTypes[i] === TYPE_OBJECT) {
                            writeObject(array[i], objectColumns);
                        }
                    }
                }
        }

        // console.log('array', array, 'values', writer.written - written);

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
    const stringRefs = [];
    let stringIdx = 0;
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

    writer.writeUint8(inputType);
    typeWriteHandler[inputType](input);

    const structureBytes = writer.value;
    const stringBytes = writeStrings(strings, stringRefs, writer, writeArray);

    return Buffer.concat([
        stringBytes,
        structureBytes
    ]);
}
