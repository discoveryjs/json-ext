const MAX_INT_32 = 2147483647;
const MAX_UINT_32 = 4294967295;
const MAX_ADAPTIVE_8 = 0x7f;
const MAX_ADAPTIVE_16 = 0x3fff;
const MAX_ADAPTIVE_32 = 0x1ffffff;
const TYPE = Object.fromEntries([
    'END',
    'NULL',
    'TRUE',
    'FALSE',
    'STRING_EMPTY',
    'STRING',
    'STRING_REF',
    'INT_8',
    'INT_16',
    'INT_32',
    'INT_64',
    'UINT_8',
    'UINT_16',
    'UINT_32',
    'UINT_64',
    'FLOAT_32',
    'FLOAT_64',
    'OBJECT_EMPTY',
    'OBJECT',
    'OBJECT_REF',
    'OBJECT_ENTRY_REF',
    'ARRAY_EMPTY',
    'ARRAY_MIXED',
    'ARRAY_TYPED'
].map((t, idx) => [t, idx << 1]));
const TYPED_ARRAY_TYPE = new Set([
    'STRING',
    'INT_8',
    'INT_16',
    'INT_32',
    'UINT_8',
    'UINT_16',
    'UINT_32',
    'FLOAT_32',
    'FLOAT_64'
].map(t => TYPE[t]));
// const TYPE_NAME = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));
const TEST_FLOAT_32 = new Float32Array(1);

function getType(value) {
    if (value === null || value === undefined) {
        return TYPE.NULL;
    }

    switch (typeof value) {
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

            if (value > 0) {
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
                if (value.length === 0) {
                    return TYPE.ARRAY_EMPTY;
                }

                const elemType = getType(value[0]);

                if (!TYPED_ARRAY_TYPE.has(elemType)) {
                    return TYPE.ARRAY_MIXED;
                }

                for (let i = 1; i < value.length; i++) {
                    // TODO: determine when we can do an upgrade i.e. int_8 -> int_16 / int_32
                    if (getType(value[i]) !== elemType) {
                        return TYPE.ARRAY_MIXED;
                    }
                }

                return TYPE.ARRAY_TYPED;
            }

            for (const key in value) {
                if (Object.hasOwnProperty.call(value, key)) {
                    return TYPE.OBJECT;
                }
            }

            return TYPE.OBJECT_EMPTY;
    }
}

function encode(rootValue) {
    function writeAdaptiveNumber(num) {
        //  8: num << 1 |   0  –  7 bits data | xxxx xxx0
        // 16: num << 2 |  01  - 14 bits data | xxxx xxxx xxxx xx01
        // 32: num << 3 | 011  – 29 bits data | xxxx xxxx xxxx xxxx xxxx xxxx xxxx x011
        // 64: num << 3 | 111  – 61 bits data | xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx x111
        if (num <= MAX_ADAPTIVE_8) {
            view.setUint8(pos, num << 1  | 0b0000);
            pos += 1;
        } else if (num <= MAX_ADAPTIVE_16) {
            view.setUint16(pos, num << 2 | 0b0001, true);
            pos += 2;
        } else if (num <= MAX_ADAPTIVE_32) {
            view.setUint32(pos, num << 3 | 0b0011, true);
            pos += 4;
        } else {
            view.setBigUint64(pos, (BigInt(num) << 3) | 0b0111, true);
            bic++;
            pos += 8;
        }
    }

    function writeType(type) {
        writeAdaptiveNumber(type << 1);
    }

    function writeReference(ref) {
        writeAdaptiveNumber(ref << 1 | 1);
    }

    function writeValue(type, value) {
        switch (type) {
            case TYPE.STRING:
                if (defs.has(value)) {
                    writeReference(defs.get(value).get(0));
                } else {
                    const strBuffer = stringEncoder.encode(value);

                    // console.log('+', defCount, value);
                    defs.set(value, new Map([[0, defCount++]]));
                    writeAdaptiveNumber(strBuffer.length << 1);

                    bytes.set(strBuffer, pos);
                    pos += strBuffer.length;
                }
                break;

            case TYPE.INT_8:
                view.setInt8(pos, value);
                pos += 1;
                break;

            case TYPE.INT_16:
                view.setInt16(pos, value);
                pos += 2;
                break;

            case TYPE.INT_32:
                view.setInt32(pos, value);
                pos += 4;
                break;

            case TYPE.INT_64:
                view.setBigInt64(pos, BigInt(value));
                pos += 8;
                break;

            case TYPE.UINT_8:
                view.setUint8(pos, value);
                pos += 1;
                break;

            case TYPE.UINT_16:
                view.setUint16(pos, value);
                pos += 2;
                break;

            case TYPE.UINT_32:
                view.setUint32(pos, value);
                pos += 4;
                break;

            case TYPE.UINT_64:
                view.setBigUint64(pos, BigInt(value));
                bic++;
                pos += 8;
                break;

            case TYPE.FLOAT_32:
                view.setFloat32(pos, value);
                pos += 4;
                break;

            case TYPE.FLOAT_64:
                view.setFloat64(pos, value);
                pos += 8;
                break;

            case TYPE.OBJECT:
                for (const key in value) {
                    if (Object.hasOwnProperty.call(value, key)) {
                        const type = getType(value[key]);

                        if (defs.has(key) && defs.get(key).has(type)) {
                            // ref
                            writeReference(defs.get(key).get(type));
                        } else {
                            write(key);

                            // console.log('+', defCount, key, type);
                            defs.get(key).set(type, defCount++);
                            writeType(type);
                        }

                        writeValue(type, value[key]);
                    }
                }

                writeType(TYPE.END);
                break;

            case TYPE.ARRAY_TYPED:
                const elemType = getType(value[0]);

                writeType(elemType);
                writeAdaptiveNumber(value.length, 1);

                for (const elem of value) {
                    writeValue(elemType, elem);
                }
                break;

            case TYPE.ARRAY_MIXED:
                for (const elem of value) {
                    write(elem);
                }

                writeType(TYPE.END);
                break;
        }
    }

    function write(value) {
        const type = getType(value);

        writeType(type);
        writeValue(type, value);
    }

    const stringEncoder = new TextEncoder();
    const bytes = new Uint8Array(300000000);
    const view = new DataView(bytes.buffer);
    const defs = new Map();
    let defCount = 0;
    let pos = 0;
    let bic = 0;

    write(rootValue);
    console.log('bigint', bic);

    return bytes.subarray(0, pos);
}

function decode(bytes) {
    function readAdaptiveNumber() {
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
        return readAdaptiveNumber() >> 1;
    }

    function readValue(type) {
        if (type & 1) {
            return defs[type >> 1];
        }

        switch (type) {
            case TYPE.NULL:
                return null;

            case TYPE.TRUE:
                return true;

            case TYPE.FALSE:
                return false;

            case TYPE.STRING: {
                const num = readAdaptiveNumber();
                const isReference = num & 1;

                if (isReference) {
                    // reference
                    const ref = num >> 1;
                    return defs[ref];
                }

                // definition
                const len = num >> 1;
                const value = stringDecoder.decode(bytes.buffer.slice(pos, pos + len));

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

            case TYPE.OBJECT_EMPTY:
                return {};

            case TYPE.OBJECT: {
                const value = {};

                while (bytes[pos] !== TYPE.END) {
                    const type = readAdaptiveNumber();

                    if (type & 1 && Array.isArray(defs[type >> 1])) {
                        // reference
                        const [key, entryType] = defs[type >> 1];
                        value[key] = readValue(entryType);
                    } else {
                        // definition
                        const key = readValue(type >> 1);
                        const entryType = readType();

                        defs.push([key, entryType]);
                        value[key] = readValue(entryType);
                    }
                }

                pos++;

                return value;
            }

            case TYPE.ARRAY_EMPTY:
                return [];

            case TYPE.ARRAY_TYPED: {
                const elemType = readType();
                const len = readAdaptiveNumber();
                const value = [];

                for (let i = 0; i < len; i++) {
                    value.push(readValue(elemType));
                }

                return value;
            }

            case TYPE.ARRAY_MIXED: {
                const value = [];

                while (bytes[pos] !== TYPE.END) {
                    value.push(readValue(readType()));
                }

                pos++;

                return value;
            }
        }
    }

    const stringDecoder = new TextDecoder();
    const view = new DataView(bytes.buffer);
    const defs = [];
    let pos = 0;

    return readValue(readType());
}

module.exports = {
    encode,
    decode
};
