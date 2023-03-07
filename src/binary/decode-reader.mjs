import {
    MAX_UINT_28,
    MAX_UINT_32,
    UNPACK_TYPE
} from './const.mjs';

const typeIndexDictionary = new Uint8Array(32);

export class Reader {
    constructor(bytes) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.bytes = bytes;
        this.pos = 0;
    }

    readBytes(len) {
        return this.bytes.subarray(this.pos, this.pos += len);
    }

    readTypeIndex(len, typeBitmap, unpack) {
        let typeCount = 0;
        let typeIdx = 0;

        while (typeBitmap > 0) {
            if (typeBitmap & 1) {
                typeIndexDictionary[typeCount++] = typeIdx;
            }

            typeIdx++;
            typeBitmap >>= 1;
        }

        const elemType = new Uint8Array(len);
        const bitsPerType = 32 - Math.clz32(typeCount - 1);
        const mask = (1 << bitsPerType) - 1;
        const indexBytes = this.readBytes(Math.ceil(bitsPerType * len / 8));
        let indexPos = 0;
        let left = 0;
        let byte = 0;

        for (let i = 0; i < len; i++) {
            if (left < bitsPerType) {
                byte |= indexBytes[indexPos] << left;
                left += 8;
                indexPos++;
            }

            elemType[i] = unpack
                ? UNPACK_TYPE[typeIndexDictionary[byte & mask]]
                : typeIndexDictionary[byte & mask];

            byte >>= bitsPerType;
            left -= bitsPerType;
        }

        return elemType;
    }

    readVlq() {
        let num = this.view.getUint8(this.pos);

        if ((num & 0x01) === 0) {
            num = num >> 1;
            this.pos += 1;
        } else if ((num & 0x02) === 0) {
            num = this.view.getUint16(this.pos, true) >> 2;
            this.pos += 2;
        } else if ((num & 0x04) === 0) {
            num = (this.view.getUint8(this.pos + 2) << 13) | (this.view.getUint16(this.pos, true) >> 3);
            this.pos += 3;
        } else {
            const low32 = this.view.getUint32(this.pos, true);

            num = (low32 >> 3) & MAX_UINT_28;
            this.pos += 4;

            if (low32 & 0x8000_0000) {
                num += this.readUintVar() * (1 << 29);
            }
        }

        return num;
    }
    readUintVar() {
        let byte = this.view.getUint8(this.pos++);
        let value = byte & 0x7f;
        let base = 0x80;

        while (byte & 0x80) {
            byte = this.view.getUint8(this.pos++);
            value += (byte & 0x7f) * base;
            base *= 0x80;
        }

        return value;
    }
    readIntVar() {
        const num = this.readUintVar();

        return (
            num & 1
                ? -(num - 1) / 2 // FIXME?
                : num <= MAX_UINT_32 // use bitwise ops for numbers below int30, otherwise the number can be corrupted
                    ? num >>> 1
                    : num / 2
        );
    }

    readUint8() {
        const num = this.view.getUint8(this.pos);
        this.pos++;
        return num;
    }
    readInt8() {
        const num = this.view.getInt8(this.pos);
        this.pos++;
        return num;
    }
    readUint16() {
        const num = this.view.getUint16(this.pos, true);
        this.pos += 2;
        return num;
    }
    readInt16() {
        const num = this.view.getInt16(this.pos, true);
        this.pos += 2;
        return num;
    }
    readUint24() {
        const num =
            this.view.getUint16(this.pos, true) |
            (this.view.getUint8(this.pos + 2) << 16);
        this.pos += 3;
        return num;
    }
    readInt24() {
        const bytes01 = this.view.getUint16(this.pos, true);
        const bytes2 = this.view.getUint8(this.pos + 2);
        const num = bytes2 & 0x80
            ? -(0x00ff_ffff - (bytes01 | bytes2 << 16) + 1)
            : bytes01 | bytes2 << 16;
        this.pos += 3;
        return num;
    }
    readUint32() {
        const num = this.view.getUint32(this.pos, true);
        this.pos += 4;
        return num;
    }
    readInt32() {
        const num = this.view.getInt32(this.pos, true);
        this.pos += 4;
        return num;
    }
    readFloat32() {
        const num = this.view.getFloat32(this.pos);
        this.pos += 4;
        return num;
    }
    readFloat64() {
        const num = this.view.getFloat64(this.pos);
        this.pos += 8;
        return num;
    }
}
