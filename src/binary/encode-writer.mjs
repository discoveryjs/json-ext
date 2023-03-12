import {
    MAX_UINT_28,
    MAX_UINT_30,
    MAX_UINT_32,
    MAX_VLQ_8,
    MAX_VLQ_16,
    MAX_VLQ_24,

    UINT_8,
    UINT_16,
    UINT_24,
    UINT_32,
    UINT_32_VAR,
    INT_8,
    INT_16,
    INT_24,
    INT_32,
    INT_32_VAR,
    FLOAT_32,
    FLOAT_64,

    TYPE_OBJECT,
    PACK_TYPE
} from './const.mjs';
import { writeNumericArray, writeNumericArrayHeader } from './encode-number.mjs';
import { bakeStrings } from './encode-string.mjs';
import { WriterBackend } from './encode-writer-backend.mjs';

const typeIndexDictionary = new Uint8Array(32);
const VLQ_BYTES_NEEDED = new Uint8Array(33);

for (let i = 0; i < 33; i++) {
    VLQ_BYTES_NEEDED[32 - i] = Math.ceil(i / 7) || 1;
}

export class Writer {
    constructor(chunkSize) {
        this.backend = new WriterBackend(chunkSize);

        this.arrayHeaders = new Map();
        this.arrayHeaderRefs = [];
        this.strings = new Map();
        this.stringRefs = [];
        this.stringIdx = 0;
    }

    emit() {
        const { strings, stringDefs, stringSlices, stringRefs } = bakeStrings(
            [...this.strings.keys()],
            this.stringRefs
        );

        const structureBytes = this.backend.emit();

        // Write string dictionaries
        this.backend.reset();
        this.writeVlq(Buffer.byteLength(strings));
        this.backend.writeString(strings);
        writeNumericArray(this, stringDefs);
        writeNumericArray(this, stringSlices);
        writeNumericArray(this, stringRefs);

        const stringBytes = this.backend.emit();

        // Write array header dictionaries
        this.backend.reset();
        writeNumericArray(this, [...this.arrayHeaders.keys()]);
        writeNumericArray(this, this.arrayHeaderRefs);

        const arrayHeaderBytes = this.backend.emit();

        return Buffer.concat([
            stringBytes,
            arrayHeaderBytes,
            structureBytes
        ]);
    }

    // ========================================================================
    // String
    // ========================================================================

    writeString(str) {
        let ref = this.strings.get(str);

        if (ref === undefined) {
            ref = this.stringIdx++;
            this.strings.set(str, ref);
        }

        this.stringRefs.push(ref);
    }

    // ========================================================================
    // Type index
    // ========================================================================

    writeTypeIndex(types, bitmap, pack) {
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
            chunk |= typeIndexDictionary[pack ? PACK_TYPE[types[i]] : types[i]] << shift;
            shift += bitsPerType;

            if (shift >= 8) {
                this.backend.writeUint8(chunk);
                shift -= 8;
                chunk >>= 8;
            }
        }

        if (shift > 0) {
            this.backend.writeUint8(chunk);
        }
    }

    // ========================================================================
    // Array
    // ========================================================================

    // array header
    // =====================
    //
    // 1st byte:
    //
    //   7 6 5 4 3 2 1 0
    //   ┬ ┬ ┬ ┬ ┬ ┬ ┬ ┬
    //   │ │ │ │ │ │ │ └ has inlined objects
    //   │ │ │ │ │ │ └ undefined (holes)
    //   │ │ │ │ │ └ null
    //   │ │ │ │ └ number
    //   │ │ │ └ string
    //   │ │ └ has object columns
    //   │ └ true
    //   └ false
    //
    // 2nd byte (optional, carry bit = 1):
    //
    //   x x 3 2 1 0 98
    //   ┬ ┬ ┬ ┬ ┬ ┬ ┬─
    //   │ │ │ │ │ │ └ array: 00 - no, 01 - as is, 11 - flatten, 10 - ?
    //   │ │ │ │ │ └ (reserved)
    //   │ │ │ │ └ (reserved)
    //   │ │ │ └ (reserved)
    //   │ │ └ (reserved)
    //   │ └ (reserved)
    //   └ always 0 (sign bit safe encoding)
    //
    // ...numericEncoding bytes (optional, number = 1)
    //
    writeArrayHeader(typeBitmap, numericEncoding, hasObjectColumnKeys, hasObjectInlinedEntries, hasFlattenArrays) {
        const arrayTypeBytes =
            (hasFlattenArrays << 9) |
            (hasObjectColumnKeys << 5) |         // PACK_TYPE[TYPE_OBJECT] + 2
            ((typeBitmap & ~TYPE_OBJECT) << 1) | // disable object type bit
            (hasObjectInlinedEntries);

        // console.log(arrayTypeBytes.toString(2), {hasObjectColumnKeys,hasObjectInlinedEntries}, array);

        const arrayDef = (arrayTypeBytes << 16) | numericEncoding; // Use arrayTypeBytes as high bits to avoid a sign bit occupation
        let arrayDefRef = this.arrayHeaders.get(arrayDef);

        if (arrayDefRef === undefined) {
            this.arrayHeaders.set(arrayDef, arrayDefRef = this.arrayHeaders.size);
        }

        this.arrayHeaderRefs.push(arrayDefRef);
    }

    // ========================================================================
    // Numbers
    // ========================================================================

    vlqBytesNeeded(n) {
        let bytes = 0;

        while (n > MAX_UINT_28) {
            n /= 0x1000_0000;
            bytes += 4;
        }

        return VLQ_BYTES_NEEDED[Math.clz32(n)] + bytes;
    }

    // The number is stored its length in bytes in lower bits. This approach is for unsigned numbers only.
    // The same effectiveness as for int/uint var but a bit faster, since several bytes can be consumed at once.
    //   8: num << 1 |   0  –   7 payload bits | xxxx xxx0
    //  16: num << 2 |  01  -  14 payload bits | xxxx xx01 | xxxx xxxx
    //  24: num << 3 | 011  –  21 payload bits | xxxx x011 | xxxx xxxx | xxxx xxxx
    // 24+: num << 3 | 111  – 28+ payload bits | xxxx x111 | xxxx xxxx | xxxx xxxx | 0xxx xxxx
    //                                         | xxxx x111 | xxxx xxxx | xxxx xxxx | 1xxx xxxx | ...
    writeVlq(num) {
        if (num <= MAX_VLQ_8) {
            this.backend.writeUint8(num << 1  | 0b0000);
        } else if (num <= MAX_VLQ_16) {
            this.backend.writeUint16(num << 2 | 0b0001);
        } else if (num <= MAX_VLQ_24) {
            this.backend.writeUint24(num << 3 | 0b0011);
        } else {
            const lowBits = num & MAX_UINT_28;

            this.backend.writeUint32((num > lowBits ? 0x8000_0000 : 0) + ((lowBits << 3) | 0b0111));

            if (num > lowBits) {
                this.writeUintVar((num - lowBits) / (1 << 28));
            }
        }
    }

    // The number is stored byte by byte, using 7 bits of each byte
    // to store the number bits and 1 continuation bit
    writeUintVar(num) {
        if (num <= 0x7f) {
            this.backend.writeUint8(num & 0x7f);
        } else if (num <= 0x3fff) {
            this.backend.writeUint16(((num << 1) & 0x7f00) | 0x80 | (num & 0x7f));
        } else if (num <= 0x1fffff) {
            this.backend.writeUint24(((num << 2) & 0x7f0000) | 0x8000 | ((num << 1) & 0x7f00) | 0x80 | (num & 0x7f));
        } else {
            const bytesNeeded = this.vlqBytesNeeded(num);

            this.backend.ensureCapacity(bytesNeeded);

            for (let i = 0; i < bytesNeeded - 1; i++) {
                this.backend.writeUint8(0x80 | (num & 0x7f));

                num = num > MAX_UINT_32
                    ? (num - (num & 0x7f)) / 0x80
                    : num >>> 7;
            }

            this.backend.writeUint8(num & 0x7f);
        }
    }

    writeIntVar(num) {
        let sign = 0;

        if (num < 0) {
            sign = 1;
            num = -num;
        }

        // Use fast binary ops when possible
        // int31 is unsafe for shift left since changes a sign of the number
        if (num <= MAX_UINT_30) {
            num = (num << 1) | sign;
        } else {
            num = 2 * num + sign;
        }

        this.writeUintVar(num);
    }

    writeNumber(num, numericType) {
        switch (numericType) {
            case UINT_8: this.backend.writeUint8(num); break;
            case UINT_16: this.backend.writeUint16(num); break;
            case UINT_24: this.backend.writeUint24(num); break;
            case UINT_32: this.backend.writeUint32(num); break;
            case UINT_32_VAR: this.writeUintVar(num); break;

            case INT_8: this.backend.writeInt8(num); break;
            case INT_16: this.backend.writeInt16(num); break;
            case INT_24: this.backend.writeInt24(num); break;
            case INT_32: this.backend.writeInt32(num); break;
            case INT_32_VAR: this.writeIntVar(num); break;

            case FLOAT_32: this.backend.writeFloat32(num); break;
            case FLOAT_64: this.backend.writeFloat64(num); break;
            default:
                throw new Error('Unknown numeric type: ' + numericType);
        }
    }
}
