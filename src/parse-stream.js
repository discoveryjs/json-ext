const { isReadableStream } = require('./utils');

const STATE_DONE = 0;
const STATE_ANY = 1;
const STATE_OBJECT_END_OR_ENTRY_START = 2;
const STATE_OBJECT_ENTRY_START = 3;
const STATE_OBJECT_ENTRY_COLON = 4;
const STATE_OBJECT_END_OR_NEXT_ENTRY = 5;
const STATE_ARRAY_END_OR_NEXT_ELEMENT = 6;
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

    throw new Error('Chunk emitter should be readable stream, generator, async generator or function returning an iterable object');
};

class StreamParser {
    constructor() {
        this.value = undefined;
        this.stack = null;
        this.state = STATE_ANY;
        this.property = undefined;
        this.pendingChunk = undefined;
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

    push(chunk, last) {
        const isString = typeof chunk === 'string';
        let i = 0;

        if (this.pendingChunk) {
            if (isString) {
                chunk = this.pendingChunk + chunk;
            } else {
                const newChunk = chunk;
                chunk = new Uint8Array(this.pendingChunk.length + newChunk.length);
                chunk.set(this.pendingChunk);
                chunk.set(newChunk, this.pendingChunk.length);
            }
            this.pendingChunk = undefined;
        }

        scan: for (; i < chunk.length; i++) {
            const code = isString
                ? chunk.charCodeAt(i)
                : chunk[i];

            // skip whitespace
            if (code === 0x09 || code === 0x0A || code === 0x0D || code === 0x20) {
                continue;
            }

            state: switch (this.state) {
                case STATE_ANY: {
                    // consume number
                    if (code === 0x2D /* - */ || (code >= 0x30 /* 0 */ && code <= 0x39 /* 9 */)) {
                        let j = i;
                        let part = 0; // 0 int, 1 mantissa, 2 exp

                        if (code === 0x2D /* - */) {
                            j++;
                        }

                        for (; j < chunk.length; j++) {
                            const code = isString
                                ? chunk.charCodeAt(j)
                                : chunk[j];

                            if (code === 0x2E /* . */ && part === 0) {
                                part = 1;
                            } else if ((code === 0x65 /* e */ || code === 0x45 /* E */) && part < 2) {
                                part = 2;

                                if (j + 1 < chunk.length) {
                                    const next = isString
                                        ? chunk.charCodeAt(j + 1)
                                        : chunk[i];

                                    if (next === 0x2D /* - */ || next === 0x2B /* + */) {
                                        j++;
                                    }
                                }
                            } else if (code < 0x30 /* 0 */ || code > 0x39 /* 9 */) {
                                this._pushValue(Number(isString
                                    ? chunk.slice(i, j)
                                    : decoder.decode(chunk.slice(i, j))
                                ));
                                i = j - 1;
                                break state;
                            }
                        }

                        if (last) {
                            this._pushValue(Number(isString
                                ? chunk.slice(i)
                                : decoder.decode(chunk.slice(i))
                            ));
                        }

                        break scan;
                    }

                    // consume string
                    if (code === 0x22 /* " */) {
                        for (let j = i + 1, decode = false; j < chunk.length; j++) {
                            const code = isString
                                ? chunk.charCodeAt(j)
                                : chunk[j];

                            if (code === 0x22 /* " */) {
                                this._pushValue(decode
                                    ? JSON.parse(isString
                                        ? chunk.slice(i, j + 1)
                                        : decoder.decode(chunk.slice(i, j + 1)))
                                    // use (' ' + s).slice(1) as a hack to detach sliced string from original string
                                    // see V8 bug: https://bugs.chromium.org/p/v8/issues/detail?id=2869
                                    // also: https://mrale.ph/blog/2016/11/23/making-less-dart-faster.html
                                    : isString
                                        ? (' ' + chunk.slice(i + 1, j)).slice(1)
                                        : decoder.decode(chunk.slice(i + 1, j))
                                );
                                i = j;
                                break state;
                            }

                            if (code === 0x5C /* \ */) {
                                decode = true;
                                j++;
                            }
                        }

                        if (!last) {
                            break scan;
                        }

                        this.unexpectedEnd();
                    }

                    // consume keyword
                    if (code === 0x66 /* f */ || code === 0x74 /* t */ || code === 0x6e /* n */) {
                        const word = code === 0x66 /* f */
                            ? 'false'
                            : code === 0x74 /* t */
                                ? 'true'
                                : 'null';

                        if (i + word.length <= chunk.length) {
                            const actual = isString
                                ? chunk.slice(i, i + word.length)
                                : decoder.decode(chunk.slice(i, i + word.length));

                            if (actual === word) {
                                this._pushValue(code === 0x66 /* f */ ? false : code === 0x74 /* t */ ? true : null);
                                i += word.length - 1;
                                break state;
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
                        // consume string
                        for (let j = i + 1, decode = false; j < chunk.length; j++) {
                            const code = isString
                                ? chunk.charCodeAt(j)
                                : chunk[j];

                            if (code === 0x22 /* " */) {
                                this.state = STATE_OBJECT_ENTRY_COLON;
                                this.property = decode
                                    ? JSON.parse(isString
                                        ? chunk.slice(i, j + 1)
                                        : decoder.decode(chunk.slice(i, j + 1)))
                                    : isString
                                        ? chunk.slice(i + 1, j)
                                        : decoder.decode(chunk.slice(i + 1, j));
                                i = j;
                                break state;
                            }

                            if (code === 0x5C /* \ */) {
                                decode = true;
                                j++;
                            }
                        }

                        if (!last) {
                            break scan;
                        }

                        this.unexpectedEnd();
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

        this.pos += i;

        if (i < chunk.length) {
            this.pendingChunk = chunk.slice(i);
        }

        if (last) {
            if (this.state !== STATE_DONE) {
                this.unexpectedEnd();
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
