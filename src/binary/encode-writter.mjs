import {
    MAX_UINT_28,
    MAX_UINT_31,
    MAX_UINT_32,
    MAX_VLQ_8,
    MAX_VLQ_16,
    MAX_VLQ_24
} from './const.mjs';

// reusable dictionary of used types for a value seria index
const typeIndexDictionary = new Uint8Array(32);

const WRITER_DEFAULT_CHUNK_SIZE = 64 * 1024;
const WRITER_MIN_CHUNK_SIZE = 8;

export class Writer {
    constructor(chunkSize = WRITER_DEFAULT_CHUNK_SIZE) {
        this.chunks = [];
        this.stringEncoder = new TextEncoder();
        this.chunkSize = chunkSize > WRITER_MIN_CHUNK_SIZE ? chunkSize : WRITER_MIN_CHUNK_SIZE;
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
        //   8: num << 1 |   0  –   7 bits data | xxxx xxx0
        //  16: num << 2 |  01  -  14 bits data | xxxx xx01 xxxx xxxx
        //  24: num << 3 | 011  –  21 bits data | xxxx x011 xxxx xxxx xxxx xxxx
        // 24+: num << 3 | 111  – 28+ bits data | xxxx x111 xxxx xxxx xxxx xxxx 0xxx xxxx
        //                                      | xxxx x111 xxxx xxxx xxxx xxxx 1xxx xxxx var
        if (num <= MAX_VLQ_8) {
            this.writeUint8(num << 1  | 0b0000);
        } else if (num <= MAX_VLQ_16) {
            this.writeUint16(num << 2 | 0b0001);
        } else if (num <= MAX_VLQ_24) {
            this.writeUint24(num << 3 | 0b0011);
        } else {
            const lowBits = num & MAX_UINT_28;

            this.writeUint32(((num > lowBits) << 31) | (lowBits << 3) | 0b0111);

            if (num > lowBits) {
                this.writeUintVar((num - lowBits) / (1 << 29));
            }
        }
    }
    writeSignedVlq(num) {
        let sign = num < 0 ? 1 : 0;

        if (sign === 1) {
            num = -num;
        }

        if (num <= MAX_UINT_31) {
            num = (num << 1) | sign;
        } else {
            num = 2 * num + sign;
        }

        this.writeUintVar(num);;
    }
    writeReference(ref) {
        this.writeVlq((ref << 1) | 1);
    }
    writeString(str, shift = 1) {
        this.writeVlq(Buffer.byteLength(str) << shift);
        this.writeStringRaw(str);
    }
    writeStringRaw(str) {
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
    writeTypeIndex(types, bitmap) {
        let typeIdx = 0;
        let typeCount = 0;

        while (bitmap > 0) {
            if (bitmap & 1) {
                typeIndexDictionary[typeIdx] = typeCount++;
            }

            typeIdx++;
            bitmap >>= 1;
        }

        const bitsPerType = 32 - Math.clz32(typeCount - 1);
        let shift = 0;
        let chunk = 0;

        for (let i = 0; i < types.length; i++) {
            chunk |= typeIndexDictionary[types[i]] << shift;
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
    writeUint8(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.pos, value);
        this.pos += 1;
    }
    writeUint16(value) {
        this.ensureCapacity(2);
        this.view.setUint16(this.pos, value, true);
        this.pos += 2;
    }
    writeUint24(value) {
        this.ensureCapacity(3);
        this.view.setUint16(this.pos, value, true);
        this.view.setUint8(this.pos + 2, value >> 16);
        this.pos += 3;
    }
    writeUint32(value) {
        this.ensureCapacity(4);
        this.view.setUint32(this.pos, value, true);
        this.pos += 4;
    }
    writeUint64(value) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.pos, BigInt(value), true);
        this.pos += 8;
    }
    vlqBytesNeeded(n) {
        if (n === 0) {
            return 1;
        }

        let bytesNeeded = 0;

        do {
            const x = n & MAX_UINT_28;

            if (x === n) {
                bytesNeeded += Math.ceil((32 - Math.clz32(n)) / 7);
                break;
            }

            bytesNeeded += 4;
            n = (n - x) / 0x10000000;
        } while (n > 0);

        return bytesNeeded;
    }
    // The number is stored byte by byte, using 7 bits of each byte
    // to store the number bits and 1 continuation bit
    writeUintVar(num) {
        if (num === 0) {
            return this.writeUint8(0);
        }

        let bytesNeeded = this.vlqBytesNeeded(num);

        this.ensureCapacity(bytesNeeded);
        for (let i = 0; i < bytesNeeded - 1; i++) {
            this.view.setUint8(this.pos++, 0x80 | (num & 0x7f));

            num = num > MAX_UINT_32
                ? (num - (num & 0x7f)) / 0x80
                : num >>> 7;
        }

        this.view.setUint8(this.pos++, num & 0x7f);
    }
    writeFloat32(value) {
        this.ensureCapacity(4);
        this.view.setFloat32(this.pos, value);
        this.pos += 4;
    }
    writeFloat64(value) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.pos, value);
        this.pos += 8;
    }
    get written() {
        return this.chunks.reduce((s, c) => s + c.byteLength, 0) + this.pos;
    }
}
