const hasOwnProperty = Object.hasOwnProperty;
const MAX_INT_32 = 0x7fffffff;
const MAX_UINT_32 = 0xffffffff;
const MAX_VLQ_8 = 0x7f;
const MAX_VLQ_16 = 0x3fff;
const MAX_VLQ_32 = 0x1fffffff;
const TYPE = Object.fromEntries([
    // self-contained value types
    'NULL',
    'TRUE',
    'FALSE',
    // payload types
    'STRING',
    'OBJECT',
    'ARRAY',
    'UINT_8',
    'UINT_16',
    'UINT_32',
    'UINT_64',
    'INT_8',
    'INT_16',
    'INT_32',
    'INT_64',
    'FLOAT_32',
    'FLOAT_64',
    // non-store types
    'UNDEF'
].map((t, idx) => [t, idx]));
const SELF_CONTAINED_VALUE_TYPES =
    (1 << TYPE.NULL) |
    (1 << TYPE.TRUE) |
    (1 << TYPE.FALSE) |
    (1 << TYPE.UNDEF);
// const TYPE_NAME = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));
const TEST_FLOAT_32 = new Float32Array(1);
const EMPTY_MAP = new Map();
const LOW_BITS_TYPE = 0;
const LOW_BITS_FLAGS = 1;
const ARRAY_NO_LENGTH = 0b001;
const ARRAY_PRESERVE_UNDEF = 0b010;

function getType(value) {
    if (value === null) {
        return TYPE.NULL;
    }

    switch (typeof value) {
        case 'undefined':
            return TYPE.UNDEF;

        case 'boolean':
            return value ? TYPE.TRUE : TYPE.FALSE;

        case 'string':
            return TYPE.STRING;

        case 'number':
            if (!Number.isFinite(value)) {
                return TYPE.NULL;
            }

            if (!Number.isInteger(value)) {
                TEST_FLOAT_32[0] = value;
                return TEST_FLOAT_32[0] === value ? TYPE.FLOAT_32 : TYPE.FLOAT_64;
            }

            if (value >= 0) {
                if (value > MAX_UINT_32) {
                    return TYPE.UINT_64;
                }

                if (value >> 8) {
                    return value >> 16 ? TYPE.UINT_32 : TYPE.UINT_16;
                }

                return TYPE.UINT_8;
            }

            if (-value > MAX_INT_32) {
                return TYPE.INT_64;
            }

            if (-value >> 7) {
                return -value >> 15 ? TYPE.INT_32 : TYPE.INT_16;
            }

            return TYPE.INT_8;

        case 'object':
            if (Array.isArray(value)) {
                return TYPE.ARRAY;
            }

            return TYPE.OBJECT;
    }
}

const minChunkSize = 8;
const defaultChunkSize = 64 * 1024;
const typeIndex = new Uint8Array(32);

class Writer {
    constructor(chunkSize = defaultChunkSize) {
        this.chunks = [];
        this.stringEncoder = new TextEncoder();
        this.chunkSize = chunkSize < minChunkSize ? minChunkSize : chunkSize;
        this.createChunk();
    }
    get value() {
        this.flushChunk();

        const resultBuffer = Buffer.concat(this.chunks);
        this.chunks = null;

        return resultBuffer;
    }
    createChunk() {
        this.bytes = new Uint8Array(this.chunkSize);
        this.view = new DataView(this.bytes.buffer);
        this.pos = 0;
    }
    flushChunk() {
        this.chunks.push(this.bytes.subarray(0, this.pos));
        this.bytes = this.view = null;
        this.pos = 0;
    }
    ensureCapacity(bytes) {
        if (this.pos + bytes > this.bytes.length) {
            this.flushChunk();
            this.createChunk();
        }
    }
    writeVlq(num) {
        //  8: num << 1 |   0  –  7 bits data | xxxx xxx0
        // 16: num << 2 |  01  - 14 bits data | xxxx xxxx xxxx xx01
        // 32: num << 3 | 011  – 29 bits data | xxxx xxxx xxxx xxxx xxxx xxxx xxxx x011
        // 64: num << 3 | 111  – 61 bits data | xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx x111
        if (num <= MAX_VLQ_8) {
            this.writeUint8(num << 1  | 0b0000);
        } else if (num <= MAX_VLQ_16) {
            this.writeUint16(num << 2 | 0b0001, true);
        } else if (num <= MAX_VLQ_32) {
            this.writeUint32(num << 3 | 0b0011, true);
        } else {
            this.writeBigUint64((BigInt(num) << 3) | 0b0111, true);
        }
    }
    writeType(type) {
        this.writeUint8(type);
    }
    writeReference(ref) {
        this.writeVlq((ref << 1) | 1);
    }
    writeString(str) {
        this.writeVlq(Buffer.byteLength(str) << 1);

        let strPos = 0;

        while (strPos < str.length) {
            const { read, written } = this.stringEncoder.encodeInto(
                strPos > 0 ? str.slice(strPos) : str,
                this.pos > 0 ? this.bytes.subarray(this.pos) : this.bytes
            );

            strPos += read;
            this.pos += written;

            if (strPos < str.length) {
                this.flushChunk();
                this.createChunk();
            } else {
                break;
            }
        }
    }
    writeUintBytes(value, bytes) {
        this.ensureCapacity(bytes);

        switch (bytes) {
            case 1:
                this.view.setUint8(this.pos, value);
                this.pos += 1;
                break;
            case 2:
                this.view.setUint16(this.pos, value);
                this.pos += 2;
                break;
            case 3:
                this.view.setUint16(this.pos, value);
                this.view.setUint8(this.pos + 2, value >> 16);
                this.pos += 3;
                break;
            case 4:
                this.view.setUint32(this.pos, value);
                this.pos += 4;
                break;
        }
    }
    writeTypeIndex(types, bitmap) {
        let typeIdx = 0;
        let typeCount = 0;

        while (bitmap > 0) {
            if (bitmap & 1) {
                typeIndex[typeIdx] = typeCount++;
            }

            typeIdx++;
            bitmap >>= 1;
        }

        const bitsPerType = 32 - Math.clz32(typeCount - 1);
        let shift = 0;
        let chunk = 0;

        for (let i = 0; i < types.length; i++) {
            chunk |= typeIndex[types[i]] << shift;
            shift += bitsPerType;
            if (shift >= 8) {
                this.writeUint8(chunk);
                shift -= 8;
                chunk >>= 8;
            }
        }

        if (shift > 0) {
            this.writeUint8(chunk);
        }
    }
    writeInt8(value) {
        this.ensureCapacity(1);
        this.view.setInt8(this.pos, value);
        this.pos += 1;
    }
    writeInt16(value, littleEndian) {
        this.ensureCapacity(2);
        this.view.setInt16(this.pos, value, littleEndian);
        this.pos += 2;
    }
    writeInt32(value, littleEndian) {
        this.ensureCapacity(4);
        this.view.setInt32(this.pos, value, littleEndian);
        this.pos += 4;
    }
    writeBigInt64(value, littleEndian) {
        this.ensureCapacity(8);
        this.view.setBigInt64(this.pos, BigInt(value), littleEndian);
        this.pos += 8;
    }
    writeUint8(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.pos, value);
        this.pos += 1;
    }
    writeUint16(value, littleEndian) {
        this.ensureCapacity(2);
        this.view.setUint16(this.pos, value, littleEndian);
        this.pos += 2;
    }
    writeUint32(value, littleEndian) {
        this.ensureCapacity(4);
        this.view.setUint32(this.pos, value, littleEndian);
        this.pos += 4;
    }
    writeBigUint64(value, littleEndian) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.pos, BigInt(value), littleEndian);
        this.pos += 8;
    }
    writeFloat32(value, littleEndian) {
        this.ensureCapacity(4);
        this.view.setFloat32(this.pos, value, littleEndian);
        this.pos += 4;
    }
    writeFloat64(value, littleEndian) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.pos, value, littleEndian);
        this.pos += 8;
    }
    get written() {
        return this.chunks.reduce((s, c) => s + c.byteLength, 0) + this.pos;
    }
}

function encode(rootValue, options = {}) {
    function writeTypedValue(type, value, flags = 0, ignoreFields = EMPTY_MAP) {
        switch (type) {
            case TYPE.NULL:
            case TYPE.TRUE:
            case TYPE.FALSE:
            case TYPE.UNDEF:
                // write nothing, since the type is a self contained value type
                break;

            case TYPE.STRING:
                if (defs.has(value)) {
                    writer.writeReference(defs.get(value).get(-1));
                } else {
                    defs.set(value, new Map([[-1, defCount++]]));
                    writer.writeString(value);
                }
                break;

            case TYPE.INT_8:
                writer.writeInt8(value);
                break;

            case TYPE.INT_16:
                writer.writeInt16(value);
                break;

            case TYPE.INT_32:
                writer.writeInt32(value);
                break;

            case TYPE.INT_64:
                writer.writeBigInt64(BigInt(value));
                break;

            case TYPE.UINT_8:
                writer.writeUint8(value);
                break;

            case TYPE.UINT_16:
                writer.writeUint16(value);
                break;

            case TYPE.UINT_32:
                writer.writeUint32(value);
                break;

            case TYPE.UINT_64:
                writer.writeBigUint64(BigInt(value));
                break;

            case TYPE.FLOAT_32:
                writer.writeFloat32(value);
                break;

            case TYPE.FLOAT_64:
                writer.writeFloat64(value);
                break;

            case TYPE.OBJECT: {
                for (const key in value) {
                    if (hasOwnProperty.call(value, key) && !ignoreFields.has(key) && value[key] !== undefined) {
                        const type = getType(value[key]);

                        if (defs.has(key) && defs.get(key).has(type)) {
                            // ref
                            writer.writeReference(defs.get(key).get(type));
                        } else {
                            writer.writeVlq(2);
                            writeTypedValue(TYPE.STRING, key);
                            defs.get(key).set(type, defCount++);
                            writer.writeType(type);
                        }

                        writeTypedValue(type, value[key]);
                    }
                }

                writer.writeUint8(0);
                break;
            }

            case TYPE.ARRAY: {
                if (value.length === 0) {
                    // empty array, 0 as an array header:
                    // xxxxx00
                    //      |
                    //      no length

                    writer.writeInt8(0);
                    break;
                }

                const elemTypes = new Uint8Array(value.length);
                let elemIdx = 0;
                let typeCount = 0;
                let typeBitmap = 0;
                let typeList = 0;
                let typeMax = 0;
                let hasUndef = false;
                let seenNonObject = false;
                let seenObject = false;
                let objectCount = 0;
                let objects = value;

                for (const elem of value) {
                    const elemType = elem === undefined && !(flags & ARRAY_PRESERVE_UNDEF)
                        ? null
                        : getType(elem);
                    const elemTypeBit = 1 << elemType;

                    elemTypes[elemIdx++] = elemType;

                    if (elemType === TYPE.UNDEF) {
                        hasUndef = true;
                    } else if ((typeBitmap & elemTypeBit) === 0) {
                        typeCount++;
                        typeBitmap |= elemTypeBit;
                        typeList |= (typeList << 4) | elemType;
                        if (typeMax < elemType) {
                            typeMax = elemType;
                        }
                    }

                    // avoid build objects array until non-object value is found
                    if (elemType === TYPE.OBJECT) {
                        if (seenNonObject) {
                            objects[objectCount] = elem;
                        }

                        seenObject = true;
                        objectCount++;
                    } else if (!seenNonObject) {
                        seenNonObject = true;
                        objects = seenObject
                            ? value.slice(0, objectCount)
                            : [];
                    }
                }

                if ((flags & ARRAY_NO_LENGTH) === 0) {
                    writer.writeVlq(value.length);
                }

                // choose a most optimal way to write elements depends on array.length
                switch (value.length) {
                    case 1:
                        // is just write [type value]
                        writer.writeUint8(typeList);
                        writeTypedValue(typeList, value[0]);
                        break;

                    case 2:
                        // (type1 | type0) value value
                        writer.writeUint8((elemTypes[1] << 4) | elemTypes[0]);
                        writeTypedValue(elemTypes[0], value[0]);
                        writeTypedValue(elemTypes[1], value[1]);
                        break;

                    case 3:
                        // header byte
                        // 765 4 3210
                        // aaa b cccc
                        // |   | |
                        // |   | type0
                        // |   different types (more than 1 type, i.e. an additional byte for types used)
                        // undef bitmap
                        //
                        // types = 1
                        // -> header value value value
                        // types > 1
                        // -> header (type2 | type1) value value value
                        const typeBit = (typeCount + hasUndef) > 1;
                        const undef0 = elemTypes[0] === TYPE.UNDEF;
                        const undef1 = elemTypes[1] === TYPE.UNDEF;
                        const undef2 = elemTypes[2] === TYPE.UNDEF;
                        writer.writeUint8(
                            (hasUndef
                                ? (undef0 << 5) |
                                  (undef1 << 6) |
                                  (undef2 << 7)
                                : 0) |
                            // b
                            (typeBit << 4) |
                            // cccc
                            (undef0 ? 0 : elemTypes[0])
                        );

                        if (typeBit) {
                            // (type2 | type1)
                            writer.writeUint8(((undef2 ? 0 : elemTypes[2]) << 4) | (undef1 ? 0 : elemTypes[1]));
                        }

                        for (let i = 0; i < 3; i++) {
                            const elemType = elemTypes[i];

                            if (((1 << elemType) & SELF_CONTAINED_VALUE_TYPES) === 0) {
                                writeTypedValue(elemType, value[i]);
                            }
                        }

                        break;

                    default: {
                        let hasObjectInlineKeys = objectCount > 0;
                        let objectColumnKeys = EMPTY_MAP;

                        // attempt to apply column representation for objects
                        if (objectCount > 1) {
                            hasObjectInlineKeys = false;
                            objectColumnKeys = new Map();

                            // collect a condidate keys for a column representation
                            for (let i = 0; i < objectCount; i++) {
                                for (const key of Object.keys(objects[i])) {
                                    const value = objects[i][key];

                                    if (value === undefined) {
                                        continue;
                                    }

                                    let vals = objectColumnKeys.get(key);

                                    if (vals === undefined) {
                                        vals = new Array(objectCount);
                                        vals.count = 0;
                                        vals.typeBitmap = 0;
                                        vals.typeCount = 0;
                                        vals.selfValueCount = 0;
                                        objectColumnKeys.set(key, vals);
                                    }

                                    vals[i] = value;
                                    vals.count++;

                                    const valueTypeBit = 1 << getType(value);
                                    if ((vals.typeBitmap & valueTypeBit) === 0) {
                                        vals.typeBitmap |= valueTypeBit;
                                        vals.typeCount++;
                                    }
                                    if (valueTypeBit & SELF_CONTAINED_VALUE_TYPES) {
                                        vals.selfValueCount++;
                                    }
                                }
                            }

                            // exclude keys for which the column representation is not byte efficient
                            for (const [key, vals] of objectColumnKeys.entries()) {
                                const hasUndef = vals.count !== value.length;
                                const typeCount = vals.typeCount + hasUndef;

                                if (typeCount > 1) {
                                    const bitsPerType = 32 - Math.clz32(typeCount - 1);
                                    const typeBitmapIndexSize = Math.ceil((bitsPerType * value.length) / 8);

                                    const valueCount = vals.count - vals.selfValueCount;
                                    const columnSize =
                                        1 + /* min header size */
                                        1 + /* min key reprentation */
                                        typeBitmapIndexSize +
                                        valueCount;
                                    const rawObjectSize = vals.count * (1 + !hasObjectInlineKeys) + valueCount;

                                    if (columnSize > rawObjectSize) {
                                        hasObjectInlineKeys = true;
                                        objectColumnKeys.delete(key);
                                    }
                                }
                            }
                        }

                        // array header prelude (1 byte)
                        // =====================
                        // 7 65 4 3210
                        // a bb c dddd
                        // | |  |  |
                        // | |  |  type or flags (depends on lowBitsType: 0 - type, 1 - flags)
                        // | |  lowBitsType
                        // | extra types
                        // hasUndef
                        //
                        // extra types bits:
                        //   00 no extra bytes
                        //   01 list of types (1 byte = 2 types)
                        //   10 bitmap 1 byte
                        //   11 bitmap 2 bytes
                        //
                        // low bits type:
                        //   0 type (max index)
                        //   1 flags
                        //
                        // low bits flags:
                        //   x xx 1 e f g h
                        //          | | | |
                        //          | | | hasNulls (means TYPE.NULL is used, but omitted in a type list/bitmap)
                        //          | | encodedArrays (means TYPE.ARRAY is used, but omitted in a type list/bitmap)
                        //          | hasObjectInlineKeys (means TYPE.OBJECT is used, but omitted in a type list/bitmap)
                        //          hasObjectColumnKeys (means TYPE.OBJECT is used, but omitted in a type list/bitmap)
                        //
                        // special cases:
                        //   1) 0 00 0 xxxx
                        //             | TYPE.OBJECT or TYPE.ARRAY or TYPE.NULL - can be reserved for a special cases
                        //               since such cases can be represented with "0 00 1 flags" notation
                        //
                        //   2) 0 01 0 xxxx - 2-3 extra types (low 4 bits = type0)
                        //        2 types -> type byte: type1 | type1
                        //        3 types -> type byte: type2 | type1
                        //
                        //   3) 0 01 1 xxxx - 1-2 extra types
                        //        1 type  -> type byte: type0 | type0
                        //        2 types -> type byte: type1 | type0
                        const hasObjectColumnKeys = objectColumnKeys.size !== 0;
                        const encodedArrays = 0; // TBD
                        const hasNulls = typeBitmap & (1 << TYPE.NULL);
                        const lowBitsFlags =
                            (hasObjectColumnKeys << 3) |
                            (hasObjectInlineKeys << 2) |
                            (encodedArrays << 1) |
                            (hasNulls << 0);
                        const lowBitsType = lowBitsFlags !== 0 || typeCount === 0 // typeCount=0 possible when all elements are undefined and ARRAY_PRESERVE_UNDEF
                            ? LOW_BITS_FLAGS // flags
                            : LOW_BITS_TYPE; // type
                        const headerTypeBitmap =
                            typeBitmap & (0xffff ^ // switch off type bits used in lowBitsFlags
                                (lowBitsType === LOW_BITS_TYPE ? 1 << typeMax : 0) ^
                                ((hasObjectColumnKeys || hasObjectInlineKeys) << TYPE.OBJECT) ^
                                (encodedArrays << TYPE.ARRAY) ^
                                (hasNulls << TYPE.NULL)
                            );
                        const extraTypeCount = typeCount - (
                            lowBitsType === LOW_BITS_TYPE
                                ? 1
                                : (hasObjectColumnKeys || hasObjectInlineKeys) + encodedArrays + hasNulls
                        );
                        const elemTypesBits =
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
                            (elemTypesBits << 5) |
                            // c
                            (lowBitsType << 4) |
                            // dddd
                            (lowBitsType === LOW_BITS_FLAGS ? lowBitsFlags : typeMax);

                        writer.writeUint8(header);

                        // types
                        switch (elemTypesBits) {
                            case 0b01: {
                                let x = lowBitsType === LOW_BITS_FLAGS ? headerTypeBitmap : typeBitmap ^ (1 << typeMax);
                                let i = 0;
                                let types = [];

                                while (x !== 0) {
                                    if (x & 1) {
                                        types.push(i);
                                    }
                                    i++;
                                    x >>= 1;
                                }

                                if (types.length > 2) {
                                    console.log('BUG!!!');
                                }

                                writer.writeUint8(
                                    types.length === 1
                                        ? (types[0] << 4) | types[0]
                                        : (types[1] << 4) | types[0]
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

                        // write array's element values depending on types number
                        if ((typeCount + hasUndef) > 1) {
                            // an array with multi-type values

                            // write element's type index
                            writer.writeTypeIndex(elemTypes, typeBitmap | (hasUndef << TYPE.UNDEF));

                            // write elements
                            for (let i = 0; i < value.length; i++) {
                                const elemType = elemTypes[i];

                                if (hasObjectInlineKeys || elemType !== TYPE.OBJECT) {
                                    writeTypedValue(elemType, value[i], 0, objectColumnKeys);
                                }
                            }
                        } else {
                            // an array with a single type
                            if (hasObjectInlineKeys || typeMax !== TYPE.OBJECT) {
                                for (let i = 0; i < value.length; i++) {
                                    writeTypedValue(typeMax, value[i], 0, objectColumnKeys);
                                }
                            }
                        }

                        // write object column keys
                        if (hasObjectColumnKeys) {
                            // write keys
                            writer.writeVlq(objectColumnKeys.size);

                            for (const key of objectColumnKeys.keys()) {
                                writeTypedValue(TYPE.STRING, key);
                            }

                            // write value vectors
                            for (const values of objectColumnKeys.values()) {
                                writeTypedValue(TYPE.ARRAY, values, ARRAY_NO_LENGTH | ARRAY_PRESERVE_UNDEF);
                            }
                        }
                    }
                }

                break;
            }
        }
    }

    function writeValue(value) {
        const type = getType(value);

        writer.writeType(type);
        writeTypedValue(type, value);
    }

    const writer = new Writer(options.chunkSize);
    const defs = new Map();
    let defCount = 0;

    writeValue(rootValue);

    return writer.value;
}

function decode(bytes) {
    function readVlq() {
        let num = view.getUint8(pos);

        if ((num & 0x01) === 0) {
            num = num >> 1;
            pos += 1;
        } else if ((num & 0x02) === 0) {
            num = view.getUint16(pos, true) >> 2;
            pos += 2;
        } else if ((num & 0x04) === 0) {
            num = view.getUint32(pos, true) >> 3;
            pos += 4;
        } else {
            num = Number(view.getBigInt64(pos, true) >> 3n);
            pos += 8;
        }

        return num;
    }

    function readType() {
        const type = view.getUint8(pos);
        pos += 1;
        return type;
    }

    function readValue(type, flags) {
        switch (type) {
            case TYPE.NULL:
                return null;

            case TYPE.TRUE:
                return true;

            case TYPE.FALSE:
                return false;

            case TYPE.UNDEF:
                return undefined;

            case TYPE.STRING: {
                const num = readVlq();
                const isReference = num & 1;

                if (isReference) {
                    // reference
                    const ref = num >> 1;
                    return defs[ref];
                }

                // definition
                const len = num >> 1;
                const value = stringDecoder.decode(bytes.subarray(pos, pos + len));

                pos += len;
                defs.push(value);

                return value;
            }

            case TYPE.INT_8: {
                const value = view.getInt8(pos);
                pos += 1;
                return value;
            }

            case TYPE.INT_16: {
                const value = view.getInt16(pos);
                pos += 2;
                return value;
            }

            case TYPE.INT_32: {
                const value = view.getInt32(pos);
                pos += 4;
                return value;
            }

            case TYPE.INT_64: {
                const value = Number(view.getBigInt64(pos));
                pos += 8;
                return value;
            }

            case TYPE.UINT_8: {
                const value = view.getUint8(pos);
                pos += 1;
                return value;
            }

            case TYPE.UINT_16: {
                const value = view.getUint16(pos);
                pos += 2;
                return value;
            }

            case TYPE.UINT_32: {
                const value = view.getUint32(pos);
                pos += 4;
                return value;
            }

            case TYPE.UINT_64: {
                const value = Number(view.getBigUint64(pos));
                pos += 8;
                return value;
            }

            case TYPE.FLOAT_32: {
                const value = view.getFloat32(pos);
                pos += 4;
                return value;
            }

            case TYPE.FLOAT_64: {
                const value = view.getFloat64(pos);
                pos += 8;
                return value;
            }

            case TYPE.OBJECT: {
                const value = {};

                while (true) {
                    const type = readVlq();

                    // zero reference is end of the list
                    if (type === 0) {
                        break;
                    }

                    if (type & 1) {
                        // reference
                        const [key, entryType] = defs[type >> 1];
                        value[key] = readValue(entryType);
                    } else {
                        // definition
                        const key = readValue(TYPE.STRING);
                        const entryType = readType();

                        defs.push([key, entryType]);
                        value[key] = readValue(entryType);
                    }
                }

                return value;
            }

            case TYPE.ARRAY: {
                const len = typeof flags === 'number' ? flags : readVlq();

                switch (len) {
                    case 0:
                        return [];

                    case 1: {
                        const type = view.getUint8(pos);

                        pos += 1;

                        return [readValue(type)];
                    }

                    case 2: {
                        const types = view.getUint8(pos);

                        pos += 1;

                        return [readValue(types & 0x0f), readValue(types >> 4)];
                    }

                    case 3: {
                        const header = view.getUint8(pos);
                        const type0 = header & 0x0f;
                        const types12 = header & 0x10 ? view.getUint8(pos + 1) : (type0 << 4) | type0;
                        const type1 = types12 & 0x0f;
                        const type2 = types12 >> 4;
                        const undefMask = header >> 5;

                        pos += header & 0x10 ? 2 : 1;

                        return [
                            undefMask & 0x01 ? undefined : readValue(type0),
                            undefMask & 0x02 ? undefined : readValue(type1),
                            undefMask & 0x04 ? undefined : readValue(type2)
                        ];
                    }

                    default: {
                        const result = new Array(len);
                        const header = view.getUint8(pos);
                        const hasUndef = (header >> 7) & 1;
                        const extraTypes = (header >> 5) & 0b11;
                        const lowBitsType = (header >> 4) & 1;
                        const lowBitsFlags = lowBitsType === LOW_BITS_FLAGS ? header & 0x0f : 0x00;
                        const hasObjectColumnKeys = (lowBitsFlags >> 3) & 1;
                        const hasObjectInlineKeys = (lowBitsFlags >> 2) & 1;
                        const escapedArrays = (lowBitsFlags >> 1) & 1;
                        const hasNulls = (lowBitsFlags >> 0) & 1;
                        const extraTypesList = extraTypes === 0b01 ? view.getUint8(pos + 1) : 0;
                        let typeBitmap =
                            (lowBitsType === LOW_BITS_TYPE ? 1 << (header & 0x0f) : 0) |
                            (extraTypes === 0b01
                                ? (1 << (extraTypesList & 0x0f)) | (1 << (extraTypesList >> 4))
                                : extraTypes === 0b10
                                    ? view.getUint8(pos + 1)
                                    : extraTypes === 0b11
                                        ? view.getUint16(pos + 1)
                                        : 0) |
                            (hasUndef << TYPE.UNDEF) |
                            (hasNulls << TYPE.NULL) |
                            (escapedArrays << TYPE.ARRAY) |
                            ((hasObjectColumnKeys || hasObjectInlineKeys) << TYPE.OBJECT);

                        pos += 1 + (extraTypes === 0b00 ? 0 : extraTypes === 0b11 ? 2 : 1);

                        let typeCount = 0;
                        let typeIdx = 0;
                        const ownTypeIndexNeeded = typeBitmap & ((1 << TYPE.OBJECT) | (1 << TYPE.ARRAY));
                        while (typeBitmap > 0) {
                            if (typeBitmap & 1) {
                                typeIndex[typeCount++] = typeIdx;
                            }

                            typeIdx++;
                            typeBitmap >>= 1;
                        }

                        let objects;
                        if (typeCount > 1) {
                            const bitsPerType = 32 - Math.clz32(typeCount - 1);
                            const mask = (1 << bitsPerType) - 1;
                            const typeMapping = ownTypeIndexNeeded
                                ? typeIndex.slice(0, typeCount)
                                : typeIndex;
                            let indexPos = pos;
                            let left = 0;
                            let byte = 0;

                            objects = [];
                            pos += Math.ceil(bitsPerType * len / 8);

                            for (let i = 0; i < len; i++) {
                                if (left < bitsPerType) {
                                    byte |= view.getUint8(indexPos) << left;
                                    left += 8;
                                    indexPos++;
                                }

                                const elemType = typeMapping[byte & mask];

                                if (elemType !== TYPE.OBJECT) {
                                    result[i] = readValue(elemType);
                                } else {
                                    objects.push(result[i] = hasObjectInlineKeys ? readValue(elemType) : {});
                                }

                                byte >>= bitsPerType;
                                left -= bitsPerType;
                            }
                        } else {
                            const elemType = typeIndex[0];

                            if (elemType === TYPE.OBJECT) {
                                objects = result;
                            }

                            for (let i = 0; i < len; i++) {
                                result[i] = elemType === TYPE.OBJECT && !hasObjectInlineKeys
                                    ? {}
                                    : readValue(elemType);
                            }
                        }

                        if (hasObjectColumnKeys) {
                            const keysLength = readVlq();
                            const keys = new Array(keysLength);

                            // read keys
                            for (let i = 0; i < keysLength; i++) {
                                keys[i] = readValue(TYPE.STRING);
                            }

                            // read column values
                            for (let i = 0; i < keysLength; i++) {
                                const key = keys[i];
                                const vals = readValue(TYPE.ARRAY, objects.length);

                                for (let j = 0; j < objects.length; j++) {
                                    if (vals[j] !== undefined) {
                                        objects[j][key] = vals[j];
                                    }
                                }
                            }
                        }

                        return result;
                    }
                }
            }
        }
    }

    const stringDecoder = new TextDecoder('utf8', { ignoreBOM: true });
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const defs = [];
    let pos = 0;

    return readValue(readType());
}

module.exports = {
    Writer,
    encode,
    decode
};
