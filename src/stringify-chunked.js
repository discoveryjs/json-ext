import {
    normalizeReplacer,
    normalizeSpace,
    replaceValue
} from './utils.js';

function encodeString(value) {
    if (/[^\x20\x21\x23-\x5B\x5D-\uD799]/.test(value)) { // [^\x20-\uD799]|[\x22\x5c]
        return JSON.stringify(value);
    }

    return '"' + value + '"';
}

export function* stringifyChunked(value, optionsOrReplacer, space) {
    if (optionsOrReplacer === null || Array.isArray(optionsOrReplacer) || typeof optionsOrReplacer !== 'object') {
        optionsOrReplacer = {
            replacer: optionsOrReplacer,
            space
        };
    }

    const highWaterMark = Number(optionsOrReplacer.highWaterMark) || 0x4000; // 16kb by default
    let replacer = normalizeReplacer(optionsOrReplacer.replacer);
    space = normalizeSpace(optionsOrReplacer.space);

    const keyStrings = new Map();
    const visited = new Set();
    let buffer = '';
    let depth = 0;
    let stack = null;
    let first = true;
    let getKeys = Object.keys;

    if (Array.isArray(replacer)) {
        const allowlist = replacer;

        getKeys = () => allowlist;
        replacer = null;
    }

    pushStack(processRoot, value, null);

    while (stack !== null) {
        while (stack !== null) {
            stack.handler();

            if (buffer.length >= highWaterMark) {
                break;
            }
        }

        // flush buffer
        yield buffer;
        buffer = '';
    }

    function processRoot() {
        const { value } = stack;

        popStack();
        processValue({ '': value }, '', value, () => {});
    }

    function processObjectEntry(key) {
        if (first === true) {
            first = false;
        } else {
            buffer += ',';
        }

        let keyString = keyStrings.get(key);
        if (keyString === undefined) {
            keyStrings.set(key, keyString = encodeString(key) + ':');
        }

        if (space) {
            buffer += `\n${space.repeat(depth)}${keyString} `;
        } else {
            buffer += keyString;
        }
    }

    function processObject() {
        const { index, value, keys } = stack;

        // when no keys left, remove obj from stack
        if (index === keys.length) {
            if (space && first === false) {
                buffer += `\n${space.repeat(depth - 1)}}`;
            } else {
                buffer += '}';
            }

            popStack();
            return;
        }

        const key = keys[index];

        stack.index++;
        processValue(value, key, value[key], processObjectEntry);
    }

    function processArrayItem(index) {
        if (index !== 0) {
            buffer += ',';
        }

        if (space) {
            buffer += `\n${space.repeat(depth)}`;
        }
    }

    function processArray() {
        const { index, value } = stack;

        if (index === value.length) {
            if (space && index !== 0) {
                buffer += `\n${space.repeat(depth - 1)}]`;
            } else {
                buffer += ']';
            }

            popStack();
            return;
        }

        stack.index++;
        processValue(value, index, value[index], processArrayItem);
    }

    function processValue(holder, key, value, callback) {
        value = replaceValue(holder, key, value, replacer);

        if (value === null || typeof value !== 'object') {
            // primitive
            if (callback !== processObjectEntry || value !== undefined) {
                callback(key);
                pushPrimitive(value);
            }
        } else if (Array.isArray(value)) {
            // array
            callback(key);
            circularCheck(value);
            depth++;
            buffer += '[';
            pushStack(processArray, value, null);
        } else {
            // object
            callback(key);
            circularCheck(value);
            depth++;
            buffer += '{';
            pushStack(processObject, value, getKeys(value));
        }
    }

    function circularCheck(value) {
        // If the visited set does not change after adding a value, then it is already in the set
        if (visited.size === visited.add(value).size) {
            throw new TypeError('Converting circular structure to JSON');
        }
    }

    function pushPrimitive(value) {
        switch (typeof value) {
            case 'string':
                buffer += encodeString(value);
                break;

            case 'number':
                buffer += Number.isFinite(value) ? String(value) : 'null';
                break;

            case 'boolean':
                buffer += value ? 'true' : 'false';
                break;

            case 'undefined':
            case 'object': // typeof null === 'object'
                buffer += 'null';
                break;

            default:
                throw new TypeError(`Do not know how to serialize a ${value.constructor?.name || typeof value}`);
        }
    }

    function pushStack(handler, value, keys) {
        first = true;
        stack = {
            handler,
            value,
            index: 0,
            keys,
            prev: stack
        };
    }

    function popStack() {
        const { handler, value } = stack;

        if (handler === processObject || handler === processArray) {
            visited.delete(value);
            depth--;
        }

        stack = stack.prev;
        first = false;
    }
};
