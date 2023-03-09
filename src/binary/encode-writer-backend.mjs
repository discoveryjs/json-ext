const WRITER_DEFAULT_CHUNK_SIZE = 64 * 1024;
const WRITER_MIN_CHUNK_SIZE = 8;

export class WriterBackend {
    constructor(chunkSize = WRITER_DEFAULT_CHUNK_SIZE) {
        this.stringEncoder = new TextEncoder();
        this.chunkSize = chunkSize > WRITER_MIN_CHUNK_SIZE ? chunkSize : WRITER_MIN_CHUNK_SIZE;
        this.reset();
    }

    // ========================================================================
    // Operating with internal buffers
    // ========================================================================

    reset() {
        this.chunks = [];
        this.createChunk();
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
    emit() {
        this.flushChunk();

        const resultBuffer = Buffer.concat(this.chunks);
        this.chunks = null;

        return resultBuffer;
    }

    get written() {
        return this.chunks !== null
            ? this.chunks.reduce((s, c) => s + c.byteLength, 0) + this.pos
            : 0;
    }

    // ========================================================================
    // Bytes sequencies
    // ========================================================================

    writeBytes(bytes) {
        let bytesRead = 0;

        while (bytesRead < bytes.byteLength) {
            const capacity = this.bytes.byteLength - this.pos;
            const chunk = bytes.subarray(bytesRead, bytesRead += capacity);

            this.bytes.set(chunk, this.pos);
            this.pos += chunk.byteLength;

            if (bytesRead < bytes.byteLength) {
                this.flushChunk();
                this.createChunk();
            }
        }
    }
    writeString(str) {
        let strRead = 0;

        while (strRead < str.length) {
            const { read, written } = this.stringEncoder.encodeInto(
                strRead > 0 ? str.slice(strRead) : str,
                this.pos > 0 ? this.bytes.subarray(this.pos) : this.bytes
            );

            strRead += read;
            this.pos += written;

            if (strRead < str.length) {
                this.flushChunk();
                this.createChunk();
            }
        }
    }

    // ========================================================================
    // Numbers
    // ========================================================================

    writeUint8(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.pos, value);
        this.pos += 1;
    }
    writeInt8(value) {
        this.ensureCapacity(1);
        this.view.setInt8(this.pos, value);
        this.pos += 1;
    }
    writeUint16(value) {
        this.ensureCapacity(2);
        this.view.setUint16(this.pos, value, true);
        this.pos += 2;
    }
    writeInt16(value) {
        this.ensureCapacity(2);
        this.view.setInt16(this.pos, value, true);
        this.pos += 2;
    }
    writeUint24(value) {
        this.ensureCapacity(3);
        this.view.setUint16(this.pos, value, true);
        this.view.setUint8(this.pos + 2, value >> 16);
        this.pos += 3;
    }
    writeInt24(value) {
        this.ensureCapacity(3);
        this.view.setInt16(this.pos, value, true);
        this.view.setInt8(this.pos + 2, value >> 16);
        this.pos += 3;
    }
    writeUint32(value) {
        this.ensureCapacity(4);
        this.view.setUint32(this.pos, value, true);
        this.pos += 4;
    }
    writeInt32(value) {
        this.ensureCapacity(4);
        this.view.setInt32(this.pos, value, true);
        this.pos += 4;
    }
    writeUint64(value) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.pos, BigInt(value), true);
        this.pos += 8;
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
}
