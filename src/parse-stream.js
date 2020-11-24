const { isReadableStream } = require('./utils');

const STATE_DONE = 0;
const STATE_ANY = 1;
const STATE_STRING = 2;
const STATE_OBJECT_END_OR_ENTRY_START = 3;
const STATE_OBJECT_ENTRY_START = 4;
const STATE_OBJECT_ENTRY_PROPERTY = 5;
const STATE_OBJECT_ENTRY_COLON = 6;
const STATE_OBJECT_END_OR_NEXT_ENTRY = 7;
const STATE_ARRAY_END_OR_NEXT_ELEMENT = 8;
const decoder = new TextDecoder();

function isObject(value) {
    return value !== null && typeof value === 'object';
}

module.exports = function(chunkEmitter) {
    let parser = new StreamParser();

    if (isObject(chunkEmitter) && isReadableStream(chunkEmitter)) {
        return new Promise((resolve, reject) => {
            chunkEmitter
                .on('data', chunk => {
                    try {
                        parser.push(chunk);
                    } catch (e) {
                        parser = null;
                        reject(e);
                    }
                })
                .on('error', (e) => {
                    parser = null;
                    reject(e);
                })
                .on('end', () => {
                    try {
                        resolve(parser.finish());
                    } catch (e) {
                        reject(e);
                    } finally {
                        parser = null;
                    }
                });
        });
    }

    if (typeof chunkEmitter === 'function') {
        const iterator = chunkEmitter();

        if (isObject(iterator) && (Symbol.iterator in iterator || Symbol.asyncIterator in iterator)) {
            return new Promise(async (resolve, reject) => {
                try {
                    for await (const chunk of iterator) {
                        parser.push(chunk);
                    }

                    resolve(parser.finish());
                } catch (e) {
                    reject(e);
                } finally {
                    parser = null;
                }
            });
        }
    }

    throw new Error(
        'Chunk emitter should be readable stream, generator, ' +
        'async generator or function returning an iterable object'
    );
};

// Adopted from https://github.com/mathiasbynens/utf8.js/blob/master/utf8.js
function utf8bytes(string, from, to) {
    let res = 0;

    for (let i = from; i < to; i++) {
        const code = string.charCodeAt(i);

        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < to) {
            // high surrogate, and there is a next character
            if ((string.charCodeAt(i + 1) & 0xFC00) == 0xDC00) { // low surrogate
                res += 4; // 4-byte sequence
                i++;
            } else {
                // unmatched surrogate; only append this code unit, in case the next
                // code unit is the high surrogate of a surrogate pair
                res += 3; // 3-byte sequence
            }
        } else {
            res += code < 128 ? 1 : code < 2048 ? 2 : 3;
        }
    }

    return res;
}

class StreamParser {
    constructor() {
        this.value = undefined;
        this.stack = null;
        this.state = STATE_ANY;
        this.property = undefined;
        this.pendingChunk = undefined;
        this.pendingString = '';
        this.pendingStringDecode = false;
        this.pendingStringEscape = false;
        this.pos = 0;
    }

    _pushValue(value) {
        if (this.stack === null) {
            this.value = value;
            this.state = STATE_DONE;
            return;
        }

        if (this.stack.isArray) {
            this.stack.value.push(value);
            this.state = STATE_ARRAY_END_OR_NEXT_ELEMENT;
        } else {
            this.stack.value[this.property] = value;
            this.state = STATE_OBJECT_END_OR_NEXT_ENTRY;
        }
    }

    _popStack() {
        this.stack = this.stack.prev;
        this.state = this.stack === null
            ? STATE_DONE
            : this.stack.isArray
                ? STATE_ARRAY_END_OR_NEXT_ELEMENT
                : STATE_OBJECT_END_OR_NEXT_ENTRY;
    }

    push(rawChunk, last = false) {
        let uncompletedSeqLength = 0;
        let chunk;
        let chunkLength;
        let i = 0;

        if (typeof rawChunk === 'string') {
            // Prepend pending chunk if any
            if (this.pendingChunk) {
                rawChunk = this.pendingChunk + rawChunk;
                this.pendingChunk = undefined;
            }

            // If chunk is a string use all the chunk as is
            chunk = rawChunk;
            chunkLength = rawChunk.length;
        } else {
            // Suppose chunk is Buffer or Uint8Array
            // Prepend pending chunk if any
            if (this.pendingChunk) {
                const origRawChunk = rawChunk;
                rawChunk = new Uint8Array(this.pendingChunk.length + origRawChunk.length);
                rawChunk.set(this.pendingChunk);
                rawChunk.set(origRawChunk, this.pendingChunk.length);
                this.pendingChunk = undefined;
            }

            // In case of Buffer/Uint8Array, input encoded in UTF8
            // Seek for parts of uncompleted UTF8 symbol on the ending
            // This makes sence only if we expect more chunks and last char is not multi-bytes
            if (!last && rawChunk[rawChunk.length - 1] > 127) {
                for (; uncompletedSeqLength < rawChunk.length; uncompletedSeqLength++) {
                    const byte = rawChunk[rawChunk.length - 1 - uncompletedSeqLength];

                    // 10xxxxxx - 2nd, 3rd or 4th byte
                    // 110xxxxx – first byte of 2-byte sequence
                    // 1110xxxx - first byte of 3-byte sequence
                    // 11110xxx - first byte of 4-byte sequence
                    if (byte >> 6 === 3) {
                        uncompletedSeqLength++;

                        // It's completed actually
                        if ((uncompletedSeqLength === 4 && byte >> 3 === 0b11110) ||
                            (uncompletedSeqLength === 3 && byte >> 4 === 0b1110) ||
                            (uncompletedSeqLength === 2 && byte >> 5 === 0b110)) {
                            uncompletedSeqLength = 0;
                        }

                        break;
                    }
                }
            }

            // Convert chunk to string, since single decode per chunk
            // is much effective than decode multiple small substrings
            chunk = decoder.decode(rawChunk);

            // Ignore last char since it's uncompleted
            chunkLength = chunk.length - (uncompletedSeqLength > 0 ? 1 : 0);
        }

        // Main scan loop
        scan: for (; i < chunkLength; i++) {
            // consume string
            if (this.state === STATE_STRING || this.state === STATE_OBJECT_ENTRY_PROPERTY) {
                const start = i;

                for (; i < chunkLength; i++) {
                    if (this.pendingStringEscape) {
                        this.pendingStringEscape = false;
                        continue;
                    }

                    const code = chunk.charCodeAt(i);

                    if (code === 0x22 /* " */) {
                        const value = this.pendingStringDecode
                            ? JSON.parse(this.pendingString + chunk.slice(start, i + 1))
                            // use (' ' + s).slice(1) as a hack to detach sliced string from original string
                            // see V8 bug: https://bugs.chromium.org/p/v8/issues/detail?id=2869
                            // also: https://mrale.ph/blog/2016/11/23/making-less-dart-faster.html
                            : (this.pendingString + chunk.slice(start, i)).slice(1);

                        this.pendingString = '';

                        if (this.state === STATE_STRING) {
                            this._pushValue(value);
                        } else {
                            this.state = STATE_OBJECT_ENTRY_COLON;
                            this.property = value;
                        }

                        continue scan;
                    }

                    if (code === 0x5C /* \ */) {
                        this.pendingStringDecode = true;
                        this.pendingStringEscape = true;
                    }
                }

                if (!last) {
                    this.pendingString += chunk.slice(start, chunkLength);
                    break scan;
                }

                this.unexpectedEnd();
            }

            const code = chunk.charCodeAt(i);

            // skip whitespace
            if (code === 0x09 || code === 0x0A || code === 0x0D || code === 0x20) {
                continue;
            }

            switch (this.state) {
                case STATE_ANY: {
                    // consume number
                    if (code === 0x2D /* - */ || (code >= 0x30 /* 0 */ && code <= 0x39 /* 9 */)) {
                        let j = i;
                        let part = 0; // 0 int, 1 mantissa, 2 exp

                        if (code === 0x2D /* - */) {
                            j++;
                        }

                        for (; j < chunkLength; j++) {
                            const code = chunk.charCodeAt(j);

                            if (code === 0x2E /* . */ && part === 0) {
                                part = 1;
                            } else if ((code === 0x65 /* e */ || code === 0x45 /* E */) && part < 2) {
                                part = 2;

                                if (j + 1 < chunkLength) {
                                    const next = chunk.charCodeAt(j + 1);

                                    if (next === 0x2D /* - */ || next === 0x2B /* + */) {
                                        j++;
                                    }
                                }
                            } else if (code < 0x30 /* 0 */ || code > 0x39 /* 9 */) {
                                this._pushValue(Number(chunk.slice(i, j)));
                                i = j - 1;
                                continue scan;
                            }
                        }

                        if (last) {
                            this._pushValue(Number(chunk.slice(i, chunkLength)));
                        }

                        break scan;
                    }

                    // consume string
                    if (code === 0x22 /* " */) {
                        this.state = STATE_STRING;
                        this.pendingString = '"';
                        this.pendingStringEscape = false;
                        this.pendingStringDecode = false;
                        break;
                    }

                    // consume keyword
                    if (code === 0x66 /* f */ || code === 0x74 /* t */ || code === 0x6e /* n */) {
                        const word = code === 0x66 /* f */
                            ? 'false'
                            : code === 0x74 /* t */
                                ? 'true'
                                : 'null';

                        if (i + word.length <= chunkLength) {
                            const actual = chunk.slice(i, i + word.length);

                            if (actual === word) {
                                this._pushValue(code === 0x66 /* f */ ? false : code === 0x74 /* t */ ? true : null);
                                i += word.length - 1;
                                continue scan;
                            }

                            this.error(chunk, i);
                        }

                        if (!last) {
                            break scan;
                        }

                        this.error(chunk, i);
                    }

                    if (code === 0x7B /* { */) {
                        // begin object
                        const value = {};

                        this._pushValue(value);
                        this.state = STATE_OBJECT_END_OR_ENTRY_START;
                        this.stack = {
                            isArray: false,
                            value,
                            prev: this.stack
                        };
                    } else if (code === 0x5B /* [ */) {
                        // begin array
                        const value = [];

                        this._pushValue(value);
                        this.state = STATE_ANY;
                        this.stack = {
                            isArray: true,
                            value,
                            prev: this.stack
                        };
                    } else if (code === 0x5D /* ] */ && this.stack !== null && this.stack.isArray) {
                        // end array
                        this._popStack();
                    } else {
                        this.error(chunk, i);
                    }

                    break;
                }

                case STATE_OBJECT_END_OR_ENTRY_START:
                case STATE_OBJECT_ENTRY_START: {
                    if (code === 0x22 /* " */) {
                        this.state = STATE_OBJECT_ENTRY_PROPERTY;
                        this.pendingString = '"';
                        this.pendingStringDecode = false;
                        this.pendingStringEscape = false;
                        break;
                    }

                    // end
                    if (code === 0x7D /* } */ && this.state === STATE_OBJECT_END_OR_ENTRY_START) {
                        this._popStack();
                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_OBJECT_ENTRY_COLON: {
                    if (code === 0x3A /* : */) {
                        this.state = STATE_ANY;
                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_OBJECT_END_OR_NEXT_ENTRY: {
                    // next
                    if (code === 0x2C /* , */) {
                        this.state = STATE_OBJECT_ENTRY_START;
                        break;
                    }

                    // end
                    if (code === 0x7D /* } */) {
                        this._popStack();
                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_ARRAY_END_OR_NEXT_ELEMENT: {
                    // next
                    if (code === 0x2C /* , */) {
                        this.state = STATE_ANY;
                        break;
                    }

                    // end
                    if (code === 0x5D /* ] */) {
                        this._popStack();
                        break;
                    }

                    this.error(chunk, i);
                }

                default:
                    this.error(chunk, i);
            }
        }

        if (last) {
            // No more chunks expected
            if (this.state !== STATE_DONE) {
                this.unexpectedEnd();
            }
        } else {
            // Update absolute position in symbols
            this.pos += i;

            // Produce pendingChunk if any
            if (typeof rawChunk === 'string') {
                if (i < chunkLength) {
                    this.pendingChunk = rawChunk.slice(i);
                }
            } else {
                let pendingSlice = utf8bytes(chunk, i, chunkLength) + uncompletedSeqLength;
                if (pendingSlice > 0) {
                    this.pendingChunk = rawChunk.slice(rawChunk.length - pendingSlice);
                }
            }
        }
    }

    finish() {
        this.push('', true);

        return this.value;
    }

    unexpectedEnd() {
        throw new SyntaxError('Unexpected end of JSON input');
    }

    error(source, pos) {
        const token = source[pos];

        throw new SyntaxError(`Unexpected ${
            typeof token === 'string' ? token : String.fromCharCode(token)
        } in JSON at position ${
            this.pos + pos
        }`);
    }
};
