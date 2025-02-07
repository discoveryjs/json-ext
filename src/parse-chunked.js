import { isIterable } from './utils.js';

const STACK_OBJECT = 1;
const STACK_ARRAY = 2;
const decoder = new TextDecoder();

function adjustPosition(error, parser) {
    if (error.name === 'SyntaxError' && parser.jsonParseOffset) {
        error.message = error.message.replace(/at position (\d+)/, (_, pos) =>
            'at position ' + (Number(pos) + parser.jsonParseOffset)
        );
    }

    return error;
}

function append(array, elements) {
    // Note: Avoid using array.push(...elements) since it may lead to
    // "RangeError: Maximum call stack size exceeded" for long arrays
    const initialLength = array.length;
    array.length += elements.length;

    for (let i = 0; i < elements.length; i++) {
        array[initialLength + i] = elements[i];
    }
}

export async function parseChunked(chunkEmitter) {
    const iterable = typeof chunkEmitter === 'function'
        ? chunkEmitter()
        : chunkEmitter;

    if (isIterable(iterable)) {
        let parser = createChunkParser();

        try {
            for await (const chunk of iterable) {
                if (typeof chunk !== 'string' && !ArrayBuffer.isView(chunk)) {
                    throw new TypeError('Invalid chunk: Expected string, TypedArray or Buffer');
                }

                parser.push(chunk);
            }

            return parser.finish();
        } catch (e) {
            throw adjustPosition(e, parser);
        }
    }

    throw new TypeError(
        'Invalid chunk emitter: Expected an Iterable, AsyncIterable, generator, ' +
        'async generator, or a function returning an Iterable or AsyncIterable'
    );
};

function createChunkParser() {
    let value = undefined;
    let valueStack = null;

    let prevArray = null;
    let prevArraySlices = [];

    let stack = new Array(100);
    let lastFlushDepth = 0;
    let flushDepth = 0;
    let stateString = false;
    let stateStringEscape = false;
    let pendingByteSeq = null;
    let pendingChunk = null;
    let chunkOffset = 0;
    let jsonParseOffset = 0;

    return {
        push,
        finish,
        get jsonParseOffset() {
            return jsonParseOffset;
        }
    };

    function mergeArraySlices() {
        if (prevArray === null) {
            return;
        }

        if (prevArraySlices.length !== 0) {
            const newArray = prevArraySlices.length === 1
                ? prevArray.concat(prevArraySlices[0])
                : prevArray.concat(...prevArraySlices);

            if (valueStack.prev !== null) {
                valueStack.prev.value[valueStack.key] = newArray;
            } else {
                value = newArray;
            }

            valueStack.value = newArray;
            prevArraySlices = [];
        }

        prevArray = null;
    }

    function parseAndAppend(fragment, wrap) {
        // Append new entries or elements
        if (stack[lastFlushDepth - 1] === STACK_OBJECT) {
            if (wrap) {
                jsonParseOffset--;
                fragment = '{' + fragment + '}';
            }

            Object.assign(valueStack.value, JSON.parse(fragment));
        } else {
            if (wrap) {
                jsonParseOffset--;
                fragment = '[' + fragment + ']';
            }

            if (prevArray === valueStack.value) {
                prevArraySlices.push(JSON.parse(fragment));
            } else {
                append(valueStack.value, JSON.parse(fragment));
                prevArray = valueStack.value;
            }
        }
    }

    function prepareAddition(fragment) {
        const { value } = valueStack;
        const expectComma = Array.isArray(value)
            ? value.length !== 0
            : Object.keys(value).length !== 0;

        if (expectComma) {
            // Skip a comma at the beginning of fragment, otherwise it would
            // fail to parse
            if (fragment[0] === ',') {
                jsonParseOffset++;
                return fragment.slice(1);
            }

            // When value (an object or array) is not empty and a fragment
            // doesn't start with a comma, a single valid fragment starting
            // is a closing bracket. If it's not, a prefix is adding to fail
            // parsing. Otherwise, the sequence of chunks can be successfully
            // parsed, although it should not, e.g. ["[{}", "{}]"]
            if (fragment[0] !== '}' && fragment[0] !== ']') {
                jsonParseOffset -= 3;
                return '[[]' + fragment;
            }
        }

        return fragment;
    }

    function flush(chunk, start, end) {
        let fragment = chunk.slice(start, end);

        // Save position correction for an error in JSON.parse() if any
        jsonParseOffset = chunkOffset + start;

        // Prepend pending chunk if any
        if (pendingChunk !== null) {
            fragment = pendingChunk + fragment;
            jsonParseOffset -= pendingChunk.length;
            pendingChunk = null;
        }

        if (flushDepth === lastFlushDepth) {
            // Depth didn't change, so it's a root value or entry/element set
            if (flushDepth > 0) {
                parseAndAppend(prepareAddition(fragment), true);
            } else {
                // That's an entire value on a top level
                value = JSON.parse(fragment);
                valueStack = {
                    value,
                    key: null,
                    prev: null
                };
            }
        } else if (flushDepth > lastFlushDepth) {
            // Add missed closing brackets/parentheses
            for (let i = flushDepth - 1; i >= lastFlushDepth; i--) {
                fragment += stack[i] === STACK_OBJECT ? '}' : ']';
            }

            if (lastFlushDepth === 0) {
                // That's a root value
                value = JSON.parse(fragment);
                valueStack = {
                    value,
                    key: null,
                    prev: null
                };
            } else {
                parseAndAppend(prepareAddition(fragment), true);
                mergeArraySlices();
            }

            // Move down to the depths to the last object/array, which is current now
            for (let i = lastFlushDepth || 1; i < flushDepth; i++) {
                let value = valueStack.value;
                let key = null;

                if (stack[i - 1] === STACK_OBJECT) {
                    // Find last entry
                    // eslint-disable-next-line curly
                    for (key in value);
                    value = value[key];
                } else {
                    // Last element
                    key = value.length - 1;
                    value = value[key];
                }

                valueStack = {
                    value,
                    key,
                    prev: valueStack
                };
            }
        } else /* flushDepth < lastFlushDepth */ {
            fragment = prepareAddition(fragment);

            // Add missed opening brackets/parentheses
            for (let i = lastFlushDepth - 1; i >= flushDepth; i--) {
                jsonParseOffset--;
                fragment = (stack[i] === STACK_OBJECT ? '{' : '[') + fragment;
            }

            parseAndAppend(fragment, false);
            mergeArraySlices();

            for (let i = lastFlushDepth - 1; i >= flushDepth; i--) {
                valueStack = valueStack.prev;
            }
        }

        lastFlushDepth = flushDepth;
    }

    function ensureChunkString(chunk) {
        if (typeof chunk !== 'string') {
            // Suppose chunk is Buffer or Uint8Array

            // Prepend uncompleted byte sequence if any
            if (pendingByteSeq !== null) {
                const origRawChunk = chunk;
                chunk = new Uint8Array(pendingByteSeq.length + origRawChunk.length);
                chunk.set(pendingByteSeq);
                chunk.set(origRawChunk, pendingByteSeq.length);
                pendingByteSeq = null;
            }

            // In case Buffer/Uint8Array, an input is encoded in UTF8
            // Seek for parts of uncompleted UTF8 symbol on the ending
            // This makes sense only if we expect more chunks and last char is not multi-bytes
            if (chunk[chunk.length - 1] > 127) {
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
                            pendingByteSeq = chunk.slice(chunk.length - seqLength); // use slice to avoid tying chunk
                            chunk = chunk.subarray(0, -seqLength); // use subarray to avoid buffer copy
                        }

                        break;
                    }
                }
            }

            // Convert chunk to a string, since single decode per chunk
            // is much effective than decode multiple small substrings
            chunk = decoder.decode(chunk);
        }

        return chunk;
    }

    function push(chunk) {
        chunk = ensureChunkString(chunk);

        const chunkLength = chunk.length;
        let lastFlushPoint = 0;
        let flushPoint = 0;

        // Main scan loop
        scan: for (let i = 0; i < chunkLength; i++) {
            if (stateString) {
                for (; i < chunkLength; i++) {
                    if (stateStringEscape) {
                        stateStringEscape = false;
                    } else {
                        switch (chunk.charCodeAt(i)) {
                            case 0x22: /* " */
                                stateString = false;
                                continue scan;

                            case 0x5C: /* \ */
                                stateStringEscape = true;
                        }
                    }
                }

                break;
            }

            switch (chunk.charCodeAt(i)) {
                case 0x22: /* " */
                    stateString = true;
                    stateStringEscape = false;
                    break;

                case 0x2C: /* , */
                    flushPoint = i;
                    break;

                case 0x7B: /* { */
                    // Open an object
                    flushPoint = i + 1;
                    stack[flushDepth++] = STACK_OBJECT;
                    break;

                case 0x5B: /* [ */
                    // Open an array
                    flushPoint = i + 1;
                    stack[flushDepth++] = STACK_ARRAY;
                    break;

                case 0x5D: /* ] */
                case 0x7D: /* } */
                    // Close an object or array
                    flushPoint = i + 1;
                    flushDepth--;

                    if (flushDepth < lastFlushDepth) {
                        flush(chunk, lastFlushPoint, flushPoint);
                        lastFlushPoint = flushPoint;
                    }

                    break;

                case 0x09: /* \t */
                case 0x0A: /* \n */
                case 0x0D: /* \r */
                case 0x20: /* space */
                    // Move points forward when they point to current position and it's a whitespace
                    if (lastFlushPoint === i) {
                        lastFlushPoint++;
                    }

                    if (flushPoint === i) {
                        flushPoint++;
                    }

                    break;
            }
        }

        if (flushPoint > lastFlushPoint) {
            flush(chunk, lastFlushPoint, flushPoint);
        }

        // Produce pendingChunk if something left
        if (flushPoint < chunkLength) {
            if (pendingChunk !== null) {
                // When there is already a pending chunk then no flush happened,
                // appending entire chunk to pending one
                pendingChunk += chunk;
            } else {
                // Create a pending chunk, it will start with non-whitespace since
                // flushPoint was moved forward away from whitespaces on scan
                pendingChunk = chunk.slice(flushPoint, chunkLength);
            }
        }

        chunkOffset += chunkLength;
    }

    function finish() {
        if (pendingChunk !== null) {
            flush('', 0, 0);
            pendingChunk = null;
        }

        return value;
    }
}
