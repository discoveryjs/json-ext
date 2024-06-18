export function isIterable(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        (
            typeof value[Symbol.iterator] === 'function' ||
            typeof value[Symbol.asyncIterator] === 'function'
        )
    );
}

export function replaceValue(holder, key, value, replacer) {
    if (value && typeof value.toJSON === 'function') {
        value = value.toJSON();
    }

    if (replacer !== null) {
        value = replacer.call(holder, String(key), value);
    }

    switch (typeof value) {
        case 'function':
        case 'symbol':
            value = undefined;
            break;

        case 'object':
            if (value !== null) {
                const cls = value.constructor;
                if (cls === String || cls === Number || cls === Boolean) {
                    value = value.valueOf();
                }
            }
            break;
    }

    return value;
}

export function normalizeReplacer(replacer) {
    if (typeof replacer === 'function') {
        return replacer;
    }

    if (Array.isArray(replacer)) {
        const allowlist = new Set(replacer
            .map(item => {
                const cls = item && item.constructor;
                return cls === String || cls === Number ? String(item) : null;
            })
            .filter(item => typeof item === 'string')
        );

        return [...allowlist];
    }

    return null;
}

export function normalizeSpace(space) {
    if (typeof space === 'number') {
        if (!Number.isFinite(space) || space < 1) {
            return false;
        }

        return ' '.repeat(Math.min(space, 10));
    }

    if (typeof space === 'string') {
        return space.slice(0, 10) || false;
    }

    return false;
}
