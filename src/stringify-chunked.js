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

    let buffer = '';
    let depth = 0;
    let stack = null;
    let first = false;
    let visited = new WeakSet();
    let processing = false;
    let getKeys = Object.keys;

    if (Array.isArray(replacer)) {
        const allowlist = replacer;

        getKeys = () => allowlist;
        replacer = null;
    }

    pushStack(processRoot, value, null);

    while (stack !== null) {
        processing = true;

        while (stack !== null && !stack.awaiting) {
            stack.handler();

            if (!processing) {
                break;
            }
        }

        processing = false;

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
        if (first === false) {
            first = true;
        } else {
            push(',');
        }

        if (space) {
            push(`\n${space.repeat(depth)}${encodeString(key)}: `);
        } else {
            push(encodeString(key) + ':');
        }
    }

    function processObject() {
        const current = stack;

        // when no keys left, remove obj from stack
        if (current.index === current.keys.length) {
            if (space && first) {
                push(`\n${space.repeat(depth - 1)}}`);
            } else {
                push('}');
            }

            popStack();
            return;
        }

        const key = current.keys[current.index];

        processValue(current.value, key, current.value[key], processObjectEntry);
        current.index++;
    }

    function processArrayItem(index) {
        if (index !== 0) {
            push(',');
        }

        if (space) {
            push(`\n${space.repeat(depth)}`);
        }
    }

    function processArray() {
        const current = stack;

        if (current.index === current.value.length) {
            if (space && current.index !== 0) {
                push(`\n${space.repeat(depth - 1)}]`);
            } else {
                push(']');
            }

            popStack();
            return;
        }

        processValue(current.value, current.index, current.value[current.index], processArrayItem);
        current.index++;
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
            push('[');
            pushStack(processArray, value, null);
        } else {
            // object
            callback(key);
            circularCheck(value);
            depth++;
            push('{');
            pushStack(processObject, value, getKeys(value));
        }
    }

    function circularCheck(value) {
        if (visited.has(value)) {
            throw new TypeError('Converting circular structure to JSON');
        }

        visited.add(value);
    }

    function pushPrimitive(value) {
        switch (typeof value) {
            case 'string':
                push(encodeString(value));
                break;

            case 'number':
                push(Number.isFinite(value) ? value : 'null');
                break;

            case 'boolean':
                push(value ? 'true' : 'false');
                break;

            case 'undefined':
            case 'object': // typeof null === 'object'
                push('null');
                break;

            default:
                throw new TypeError(`Do not know how to serialize a ${value.constructor?.name || typeof value}`);
        }
    }

    function pushStack(handler, value, keys) {
        first = false;
        return stack = {
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
        first = true;
    }

    function push(data) {
        buffer += data;
        processing = buffer.length < highWaterMark;
    }
};
