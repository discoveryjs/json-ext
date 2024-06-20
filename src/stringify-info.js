import {
    normalizeReplacer,
    normalizeSpace,
    replaceValue
} from './utils.js';

const hasOwn = typeof Object.hasOwn === 'function'
    ? Object.hasOwn
    : (object, key) => Object.hasOwnProperty.call(object, key);

// https://tc39.es/ecma262/#table-json-single-character-escapes
const escapableCharCodeSubstitution = { // JSON Single Character Escape Sequences
    0x08: '\\b',
    0x09: '\\t',
    0x0a: '\\n',
    0x0c: '\\f',
    0x0d: '\\r',
    0x22: '\\\"',
    0x5c: '\\\\'
};

const charLength2048 = Array.from({ length: 2048 }).map((_, code) => {
    if (hasOwn(escapableCharCodeSubstitution, code)) {
        return 2; // \X
    }

    if (code < 0x20) {
        return 6; // \uXXXX
    }

    return code < 128 ? 1 : 2; // UTF8 bytes
});

function isLeadingSurrogate(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isTrailingSurrogate(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

function stringLength(str) {
    let len = 0;
    let prevLeadingSurrogate = false;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        if (code < 2048) {
            len += charLength2048[code];
        } else if (isLeadingSurrogate(code)) {
            len += 6; // \uXXXX since no pair with trailing surrogate yet
            prevLeadingSurrogate = true;
            continue;
        } else if (isTrailingSurrogate(code)) {
            len = prevLeadingSurrogate
                ? len - 2  // surrogate pair (4 bytes), since we calculate prev leading surrogate as 6 bytes, substruct 2 bytes
                : len + 6; // \uXXXX
        } else {
            len += 3; // code >= 2048 is 3 bytes length for UTF8
        }

        prevLeadingSurrogate = false;
    }

    return len + 2; // +2 for quotes
}

function primitiveLength(value) {
    switch (typeof value) {
        case 'string':
            return stringLength(value);

        case 'number':
            return Number.isFinite(value) ? String(value).length : 4 /* null */;

        case 'boolean':
            return value ? 4 /* true */ : 5 /* false */;

        case 'undefined':
        case 'object':
            return 4; /* null */

        default:
            return 0;
    }
}

function spaceLength(space) {
    space = normalizeSpace(space);
    return typeof space === 'string' ? space.length : 0;
}

export function stringifyInfo(value, optionsOrReplacer, space) {
    if (optionsOrReplacer === null || Array.isArray(optionsOrReplacer) || typeof optionsOrReplacer !== 'object') {
        optionsOrReplacer = {
            replacer: optionsOrReplacer,
            space
        };
    }

    let allowlist = null;
    let replacer = normalizeReplacer(optionsOrReplacer.replacer);
    const continueOnCircular = Boolean(optionsOrReplacer.continueOnCircular);

    if (Array.isArray(replacer)) {
        allowlist = new Set(replacer);
        replacer = null;
    }

    space = spaceLength(space);

    const visited = new WeakMap();
    const stack = new Set();
    const circular = new Set();
    const root = { '': value };
    let stop = false;
    let bytes = 0;

    walk(root, '', value);

    return {
        bytes: isNaN(bytes) ? Infinity : bytes,
        circular: [...circular]
    };

    function walk(holder, key, value) {
        if (stop) {
            return;
        }

        value = replaceValue(holder, key, value, replacer);

        if (value === null || typeof value !== 'object') {
            // primitive
            if (value !== undefined || Array.isArray(holder)) {
                bytes += primitiveLength(value);
            } else if (holder === root) {
                bytes += 9; // FIXME: that's the length of undefined, should we normalize behaviour to convert it to null?
            }
        } else {
            // check for circular structure
            if (stack.has(value)) {
                circular.add(value);
                bytes += 4; // treat as null

                if (!continueOnCircular) {
                    stop = true;
                }

                return;
            }

            // duplicates
            if (visited.has(value)) {
                bytes += visited.get(value);

                return;
            }

            if (Array.isArray(value)) {
                // array
                const valueLength = bytes;

                bytes += 2; // []

                stack.add(value);

                for (let i = 0; i < value.length; i++) {
                    walk(value, i, value[i]);
                }

                if (value.length > 1) {
                    bytes += value.length - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && value.length > 0) {
                    bytes += (1 + (stack.size + 1) * space) * value.length; // for each element: \n{space}
                    bytes += 1 + stack.size * space; // for ]
                }

                visited.set(value, bytes - valueLength);
            } else {
                // object
                const valueLength = bytes;
                let entries = 0;

                bytes += 2; // {}

                stack.add(value);

                for (const key in value) {
                    if (hasOwn(value, key) && (allowlist === null || allowlist.has(key))) {
                        const prevLength = bytes;
                        walk(value, key, value[key]);

                        if (prevLength !== bytes) {
                            // value is printed
                            bytes += stringLength(key) + 1; // "key":
                            entries++;
                        }
                    }
                }

                if (entries > 1) {
                    bytes += entries - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && entries > 0) {
                    bytes += (1 + (stack.size + 1) * space + 1) * entries; // for each key-value: \n{space}
                    bytes += 1 + stack.size * space; // for }
                }

                visited.set(value, bytes - valueLength);
            }
        }
    }
};
