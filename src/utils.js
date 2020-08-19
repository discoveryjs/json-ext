const PrimitiveType = 1;
const ObjectType = 2;
const ArrayType = 3;
const PromiseType = 4;
const ReadableStringType = 5;
const ReadableObjectType = 6;

function isReadableStream(value) {
    return (
        typeof value.pipe === 'function' &&
        typeof value._read === 'function' &&
        typeof value._readableState === 'object'
    );
}

function getTypeNative(value) {
    if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
            return ArrayType;
        }

        return ObjectType;
    }

    return PrimitiveType;
}

function getTypeAsync(value) {
    if (value !== null && typeof value === 'object') {
        if (typeof value.then === 'function') {
            return PromiseType;
        }

        if (isReadableStream(value)) {
            return value._readableState.objectMode ? ReadableObjectType : ReadableStringType;
        }

        if (Array.isArray(value)) {
            return ArrayType;
        }

        return ObjectType;
    }

    return PrimitiveType;
}

function normalizeReplacer(replacer) {
    if (typeof replacer === 'function') {
        return replacer;
    }

    if (Array.isArray(replacer)) {
        const whitelist = new Set(replacer
            .map(item => typeof item === 'string' || typeof item === 'number' ? String(item) : null)
            .filter(item => typeof item === 'string')
        );

        whitelist.add('');

        return (key, value) => whitelist.has(key) ? value : undefined;
    }

    return null;
}

function normalizeSpace(space) {
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

module.exports = {
    type: {
        PRIMITIVE: PrimitiveType,
        PROMISE: PromiseType,
        ARRAY: ArrayType,
        OBJECT: ObjectType,
        STRING_STREAM: ReadableStringType,
        OBJECT_STREAM: ReadableObjectType
    },

    isReadableStream,
    getTypeNative,
    getTypeAsync,
    normalizeReplacer,
    normalizeSpace
};
