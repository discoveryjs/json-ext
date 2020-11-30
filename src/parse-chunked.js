const { isReadableStream } = require('./utils');

const STATE_DONE = 0;
const STATE_ANY = 1;
const STATE_STRING = 2;
const STATE_NUMBER = 3;
const STATE_KEYWORD = 4;
const STATE_OBJECT_END_OR_ENTRY_START = 5;
const STATE_OBJECT_ENTRY_START = 6;
const STATE_OBJECT_ENTRY_PROPERTY = 7;
const STATE_OBJECT_ENTRY_COLON = 8;
const STATE_OBJECT_END_OR_NEXT_ENTRY = 9;
const STATE_ARRAY_END_OR_NEXT_ELEMENT = 10;
const STACK_OBJECT = STATE_OBJECT_END_OR_NEXT_ENTRY;
const STACK_ARRAY = STATE_ARRAY_END_OR_NEXT_ELEMENT;
const decoder = new TextDecoder();

function isObject(value) {
    return value !== null && typeof value === 'object';
}

function adjustPosition(error, parser) {
    if (error.name === 'SyntaxError' && (parser.pos || parser.posJsonParse)) {
        error.message = error.message.replace(/at position (\d+)/, (_, pos) =>
            'at position ' + (parser.pos + Number(pos) + parser.posJsonParse)
        );
    }

    return error;
}

module.exports = function(chunkEmitter) {
    let parser = new ChunkParser();

    if (isObject(chunkEmitter) && isReadableStream(chunkEmitter)) {
        return new Promise((resolve, reject) => {
            chunkEmitter
                .on('data', chunk => {
                    try {
                        parser.push(chunk);
                    } catch (e) {
                        reject(adjustPosition(e, parser));
                        parser = null;
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
                        reject(adjustPosition(e, parser));
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
                    reject(adjustPosition(e, parser));
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

class ChunkParser {
    constructor() {
        this.value = undefined;
        this.valueStack = null;
        this.stack = new Array(100);
        this.stackDepth = 0;
        this.lastFlushDepth = 0;
        this.stateStartOffset = 0;
        this.state = STATE_ANY;
        this.uncompletedSeq = null;
        this.pendingChunk = null;
        this.stringEscape = false;
        this.pos = 0;
        this.posJsonParse = 0;
    }

    popState() {
        this.state = this.stackDepth > 0
            ? this.stack[this.stackDepth - 1]
            : STATE_DONE;
    }

    flush(chunk, start, end) {
        let fragment = chunk.slice(start, end);
        this.posJsonParse = 0; // using for position correction in JSON.parse() error if any

        // Prepend pending chunk if any
        if (this.pendingChunk !== null) {
            fragment = this.pendingChunk + fragment;
            this.pendingChunk = null;
        }

        // Skip a comma at the beginning if any
        if (fragment[0] === ',') {
            fragment = fragment.slice(1);
            this.posJsonParse++;
        }

        if (this.stackDepth === this.lastFlushDepth) {
            // Depth didn't changed, so it's a root value or entry/element set
            if (this.stackDepth > 0) {
                this.posJsonParse--;

                // Append new entries or elements
                if (this.stack[this.stackDepth - 1] === STACK_OBJECT) {
                    Object.assign(this.valueStack.value, JSON.parse('{' + fragment + '}'));
                } else {
                    this.valueStack.value.push(...JSON.parse('[' + fragment + ']'));
                }
            } else {
                // That's an entire value on a top level
                this.value = JSON.parse(fragment);
                this.valueStack = {
                    value: this.value,
                    prev: null
                };
            }
        } else if (this.stackDepth > this.lastFlushDepth) {
            // Add missed closing brackets/parentheses
            for (let i = this.stackDepth - 1; i >= this.lastFlushDepth; i--) {
                fragment += this.stack[i] === STACK_OBJECT ? '}' : ']';
            }

            if (this.lastFlushDepth === 0) {
                // That's a root value
                this.value = JSON.parse(fragment);
                this.valueStack = {
                    value: this.value,
                    prev: null
                };
            } else {
                this.posJsonParse--;

                // Parse fragment and append to current value
                if (this.stack[this.lastFlushDepth - 1] === STACK_OBJECT) {
                    Object.assign(this.valueStack.value, JSON.parse('{' + fragment + '}'));
                } else {
                    this.valueStack.value.push(...JSON.parse('[' + fragment + ']'));
                }
            }

            // Move down to the depths to the last object/array, which is current now
            for (let i = this.lastFlushDepth || 1; i < this.stackDepth; i++) {
                let value = this.valueStack.value;

                if (this.stack[i - 1] === STACK_OBJECT) {
                    // find last entry
                    let key;
                    // eslint-disable-next-line curly
                    for (key in value);
                    value = value[key];
                } else {
                    // last element
                    value = value[value.length - 1];
                }

                this.valueStack = {
                    value,
                    prev: this.valueStack
                };
            }
        } else { // this.stackDepth < this.lastFlushDepth
            // Add missed opening brackets/parentheses
            for (let i = this.lastFlushDepth - 1; i >= this.stackDepth; i--) {
                this.posJsonParse--;
                fragment = (this.stack[i] === STACK_OBJECT ? '{' : '[') + fragment;
            }

            // FIXME: fast path when fragment === '}' or ']'
            let value = JSON.parse(fragment);

            if (this.stack[this.lastFlushDepth - 1] === STACK_OBJECT) {
                Object.assign(this.valueStack.value, value);
            } else {
                this.valueStack.value.push(...value);
            }

            for (let i = this.lastFlushDepth - 1; i >= this.stackDepth; i--) {
                this.valueStack = this.valueStack.prev;
            }
        }

        this.pos += end - start;
        this.lastFlushDepth = this.stackDepth;
    }

    push(chunk, last = false) {
        if (typeof chunk !== 'string') {
            // Suppose chunk is Buffer or Uint8Array

            // Prepend uncompleted byte sequence if any
            if (this.uncompletedSeq !== null) {
                const origRawChunk = chunk;
                chunk = new Uint8Array(this.uncompletedSeq.length + origRawChunk.length);
                chunk.set(this.uncompletedSeq);
                chunk.set(origRawChunk, this.uncompletedSeq.length);
                this.uncompletedSeq = null;
            }

            // In case Buffer/Uint8Array, an input is encoded in UTF8
            // Seek for parts of uncompleted UTF8 symbol on the ending
            // This makes sence only if we expect more chunks and last char is not multi-bytes
            if (!last && chunk[chunk.length - 1] > 127) {
                for (let seqLength = 0; seqLength < chunk.length; seqLength++) {
                    const byte = chunk[chunk.length - 1 - seqLength];

                    // 10xxxxxx - 2nd, 3rd or 4th byte
                    // 110xxxxx – first byte of 2-byte sequence
                    // 1110xxxx - first byte of 3-byte sequence
                    // 11110xxx - first byte of 4-byte sequence
                    if (byte >> 6 === 3) {
                        seqLength++;

                        // If the sequence is really incomplete, then preserve it
                        // for the future chunk and cut off it from the current chunk
                        if ((seqLength !== 4 && byte >> 3 === 0b11110) ||
                            (seqLength !== 3 && byte >> 4 === 0b1110) ||
                            (seqLength !== 2 && byte >> 5 === 0b110)) {
                            this.uncompletedSeq = chunk.slice(chunk.length - seqLength);
                            chunk = chunk.slice(0, -seqLength);
                        }

                        break;
                    }
                }
            }

            // Convert chunk to a string, since single decode per chunk
            // is much effective than decode multiple small substrings
            chunk = decoder.decode(chunk);
        }

        const chunkLength = chunk.length;
        let fromPoint = 0;
        let safePoint = 0;
        let curDepth = this.stackDepth;

        // Main scan loop
        scan: for (let i = 0; i < chunkLength; i++) {
            // continues states
            switch (this.state) {
                case STATE_STRING:
                case STATE_OBJECT_ENTRY_PROPERTY: {
                    // consume string
                    for (; i < chunk.length; i++) {
                        if (this.stringEscape) {
                            this.stringEscape = false;
                            continue;
                        }

                        const code = chunk.charCodeAt(i);

                        if (code === 0x22 /* " */) {
                            if (this.state === STATE_STRING) {
                                this.popState();
                            } else {
                                this.state = STATE_OBJECT_ENTRY_COLON;
                            }

                            continue scan;
                        }

                        if (code === 0x5C /* \ */) {
                            this.stringEscape = true;
                        }
                    }

                    if (!last) {
                        break scan;
                    }

                    this.unexpectedEnd();
                }

                case STATE_NUMBER: {
                    // consume number
                    // In fact we don't need to follow the rules for a number,
                    // just scan chars that may be in an number and left validation for the JSON.parse()
                    for (; i < chunk.length; i++) {
                        const code = chunk.charCodeAt(i);

                        if ((code < 0x30 /* 0 */ || code > 0x39 /* 9 */) &&
                            code !== 0x2D /* - */ && code !== 0x2B /* + */ &&
                            code !== 0x65 /* e */ && code !== 0x45 /* E */ &&
                            code !== 0x2E /* . */) {
                            i--;
                            this.popState();
                            continue scan;
                        }
                    }

                    if (!last) {
                        break scan;
                    }

                    this.unexpectedEnd();
                }

                case STATE_KEYWORD: {
                    // In fact we don't need to follow the rules for a keyword,
                    // just scan it as a sequence of alpha chars and left validation for the JSON.parse()
                    for (; i < chunk.length; i++) {
                        const code = chunk.charCodeAt(i);

                        if (code < 0x61 /* a */ || code > 0x7A /* z */) {
                            i--;
                            this.popState();
                            continue scan;
                        }
                    }

                    if (!last) {
                        break scan;
                    }

                    this.unexpectedEnd();
                }
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
                        this.state = STATE_NUMBER;
                        break;
                    }

                    // consume string
                    if (code === 0x22 /* " */) {
                        this.state = STATE_STRING;
                        this.stringEscape = false;
                        break;
                    }

                    // consume keyword
                    if (code === 0x66 /* f */ || code === 0x74 /* t */ || code === 0x6e /* n */) {
                        this.state = STATE_KEYWORD;
                        break;
                    }

                    // begin object
                    if (code === 0x7B /* { */) {
                        safePoint = i + 1;
                        this.stack[this.stackDepth++] = STACK_OBJECT;
                        this.state = STATE_OBJECT_END_OR_ENTRY_START;
                        break;
                    }

                    // begin array
                    if (code === 0x5B /* [ */) {
                        safePoint = i + 1;
                        this.stack[this.stackDepth++] = STACK_ARRAY;
                        this.state = STATE_ANY;
                        break;
                    }

                    // end array
                    if (code === 0x5D /* ] */ && this.stackDepth > 0 && this.stack[this.stackDepth - 1] === STACK_ARRAY) {
                        safePoint = i + 1;
                        this.stackDepth--;
                        this.popState();

                        if (this.stackDepth < curDepth) {
                            this.flush(chunk, fromPoint, safePoint);
                            curDepth = this.stackDepth;
                            fromPoint = safePoint;
                        };
                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_OBJECT_END_OR_ENTRY_START:
                case STATE_OBJECT_ENTRY_START: {
                    // start entry
                    if (code === 0x22 /* " */) {
                        this.state = STATE_OBJECT_ENTRY_PROPERTY;
                        this.stringEscape = false;
                        break;
                    }

                    // end object
                    if (code === 0x7D /* } */ && this.state === STATE_OBJECT_END_OR_ENTRY_START) {
                        safePoint = i + 1;
                        this.stackDepth--;
                        this.popState();

                        if (this.stackDepth < curDepth) {
                            this.flush(chunk, fromPoint, safePoint);
                            curDepth = this.stackDepth;
                            fromPoint = safePoint;
                        }

                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_OBJECT_ENTRY_COLON: {
                    // continue entry
                    if (code === 0x3A /* : */) {
                        this.state = STATE_ANY;
                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_OBJECT_END_OR_NEXT_ENTRY: {
                    // next entry
                    if (code === 0x2C /* , */) {
                        safePoint = i;
                        this.state = STATE_OBJECT_ENTRY_START;
                        break;
                    }

                    // end object
                    if (code === 0x7D /* } */) {
                        safePoint = i + 1;
                        this.stackDepth--;
                        this.popState();

                        if (this.stackDepth < curDepth) {
                            this.flush(chunk, fromPoint, safePoint);
                            curDepth = this.stackDepth;
                            fromPoint = safePoint;
                        }

                        break;
                    }

                    this.error(chunk, i);
                }

                case STATE_ARRAY_END_OR_NEXT_ELEMENT: {
                    // next element
                    if (code === 0x2C /* , */) {
                        safePoint = i;
                        this.state = STATE_ANY;
                        break;
                    }

                    // end array
                    if (code === 0x5D /* ] */) {
                        safePoint = i + 1;
                        this.stackDepth--;
                        this.popState();

                        if (this.stackDepth < curDepth) {
                            this.flush(chunk, fromPoint, safePoint);
                            curDepth = this.stackDepth;
                            fromPoint = safePoint;
                        }

                        break;
                    }

                    this.error(chunk, i);
                }

                default:
                    this.error(chunk, i);
            }
        }

        if (safePoint > fromPoint || (last && (chunkLength > 0 || this.pendingChunk !== null))) {
            this.flush(chunk, fromPoint, last ? chunkLength : safePoint);
        }

        if (last) {
            // No more chunks expected
            this.state = STATE_DONE;
        } else {
            // Produce pendingChunk if any
            if (safePoint < chunkLength) {
                const newPending = chunk.slice(safePoint, chunkLength);

                this.pendingChunk = this.pendingChunk !== null
                    ? this.pendingChunk + newPending
                    : newPending;
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

        pos += this.pos + (this.pendingChunk !== null ? this.pendingChunk.length : 0);
        this.pos = 0;
        this.posJsonParse = 0;

        throw new SyntaxError(`Unexpected ${
            typeof token === 'string' ? token : String.fromCharCode(token)
        } in JSON at position ${
            pos
        }`);
    }
};
