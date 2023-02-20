import {
    MAX_UINT_8,
    MAX_UINT_16,
    MAX_UINT_24,
    MAX_UINT_32,

    TYPE_TRUE,
    TYPE_FALSE,
    TYPE_STRING,
    TYPE_UINT_8,
    TYPE_UINT_16,
    TYPE_UINT_24,
    TYPE_UINT_32,
    TYPE_UINT_32_VAR,
    TYPE_NEG_INT,
    TYPE_FLOAT_32,
    TYPE_FLOAT_64,
    TYPE_OBJECT,
    TYPE_ARRAY,
    TYPE_NULL,
    TYPE_UNDEF
} from './const.mjs';

const TEST_FLOAT_32 = new Float32Array(1);

export function getIntType(value) {
    if (value < 0) {
        return TYPE_NEG_INT;
    }

    // The return expression is written so that only 2 or 3 comparisons
    // are needed to choose a type
    return (
        value > MAX_UINT_16
            ? value > MAX_UINT_24
                ? value > MAX_UINT_32
                    ? TYPE_UINT_32_VAR
                    : TYPE_UINT_32
                : TYPE_UINT_24
            : value > MAX_UINT_8
                ? TYPE_UINT_16
                : TYPE_UINT_8
    );
}

export function getType(value) {
    switch (typeof value) {
        case 'undefined':
            return TYPE_UNDEF;

        case 'boolean':
            return value ? TYPE_TRUE : TYPE_FALSE;

        case 'string':
            return TYPE_STRING;

        case 'number':
            if (!Number.isFinite(value)) {
                return TYPE_NULL;
            }

            if (!Number.isInteger(value)) {
                TEST_FLOAT_32[0] = value;
                return TEST_FLOAT_32[0] === value ? TYPE_FLOAT_32 : TYPE_FLOAT_64;
            }

            return getIntType(value);

        case 'object':
            return Array.isArray(value)
                ? TYPE_ARRAY
                : value !== null
                    ? TYPE_OBJECT
                    : TYPE_NULL;
    }
}

export function getTypeCount(elemTypes, type) {
    let count = 0;

    for (let i = 0; i < elemTypes.length; i++) {
        if (elemTypes[i] === type) {
            count++;
        }
    }

    return count;
}
