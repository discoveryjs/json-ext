const PrimitiveType = 1;
const ObjectType = 2;
const ArrayType = 3;
const PromiseType = 4;
const ReadableStringType = 5;
const ReadableObjectType = 6;
const escapableCharRx = /[\u0000-\u001f\u0022\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
const escapableCharSubstitution = { // table of character substitutions
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\"': '\\\"',
    '\\': '\\\\'
};
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

function isLeadingSurrogate(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isTrailingSurrogate(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

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
    escapableCharRx,
    escapableCharSubstitution,
    escapableCharCodeSubstitution,
    isLeadingSurrogate,
    isTrailingSurrogate,
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
