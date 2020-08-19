const {
    type: {
        PRIMITIVE,
        OBJECT,
        ARRAY,
        PROMISE,
        STRING_STREAM,
        OBJECT_STREAM
    },
    normalizeReplacer,
    normalizeSpace,
    getTypeNative,
    getTypeAsync
} = require('./utils');

function stringLength(value) {
    // TODO: calculate escape length
    return value.length + 2;
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
            throw new Error(`Unknown type "${typeof value}". Please file an issue!`);
    }
}

function spaceLength(space) {
    space = normalizeSpace(space);
    return typeof space === 'string' ? space.length : 0;
}

module.exports = function jsonStrinifyInfo(value, replacer, space, options) {
    function walk(key, value) {
        if (stop) {
            return;
        }

        if (value && typeof value.toJSON === 'function') {
            value = value.toJSON();
        }

        if (replacer !== null) {
            value = replacer.call(this, key, value);
        }

        if (typeof value === 'function' || typeof value === 'symbol') {
            value = undefined;
        }

        let type = getType(value);

        // check for circular structure
        if (type !== PRIMITIVE && stack.has(value)) {
            circular.add(value);
            length += 4; // treat as null

            if (!options.continueOnCircular) {
                stop = true;
            }

            return;
        }

        switch (type) {
            case PRIMITIVE:
                if (value !== undefined || Array.isArray(this)) {
                    length += primitiveLength(value);
                } else if (this === root) {
                    length += 9; // FIXME: that's the length of undefined, show we normalize behaviour to convert it to null?
                }
                break;

            case OBJECT: {
                if (visited.has(value)) {
                    duplicate.add(value);
                    length += visited.get(value);
                    break;
                }

                const valueLength = length;
                let entries = 0;

                length += 2; // {}

                stack.add(value);

                for (const property in value) {
                    if (hasOwnProperty.call(value, property)) {
                        const prevLength = length;
                        walk.call(value, property, value[property]);

                        if (prevLength !== length) {
                            // value is printed
                            length += stringLength(property) + 1; // "property":
                            entries++;
                        }
                    }
                }

                if (entries > 1) {
                    length += entries - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && entries > 0) {
                    length += (1 + (stack.size + 1) * space + 1) * entries; // for each key-value: \n{space}
                    length += 1 + stack.size * space; // for }
                }

                visited.set(value, length - valueLength);

                break;
            }

            case ARRAY: {
                if (visited.has(value)) {
                    duplicate.add(value);
                    length += visited.get(value);
                    break;
                }

                const valueLength = length;

                length += 2; // []

                stack.add(value);

                for (let i = 0; i < value.length; i++) {
                    walk.call(value, String(i), value[i]);
                }

                if (value.length > 1) {
                    length += value.length - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && value.length > 0) {
                    length += (1 + (stack.size + 1) * space) * value.length; // for each element: \n{space}
                    length += 1 + stack.size * space; // for ]
                }

                visited.set(value, length - valueLength);

                break;
            }

            case PROMISE:
            case STRING_STREAM:
                async.add(value);
                break;

            case OBJECT_STREAM:
                length += 2; // []
                async.add(value);
                break;
        }
    }

    replacer = normalizeReplacer(replacer);
    space = spaceLength(space);
    options = options || {};

    const visited = new Map();
    const stack = new Set();
    const duplicate = new Set();
    const circular = new Set();
    const async = new Set();
    const getType = options.async ? getTypeAsync : getTypeNative;
    const root = { '': value };
    let stop = false;
    let length = 0;

    walk.call(root, '', value);

    return {
        minLength: isNaN(length) ? Infinity : length,
        circular: [...circular],
        duplicate: [...duplicate],
        async: [...async]
    };
};
