import {
    TYPE_TRUE,
    TYPE_FALSE,
    TYPE_STRING,
    TYPE_OBJECT,
    TYPE_ARRAY,
    TYPE_NULL,
    TYPE_UNDEF,
    TYPE_NUMBER
} from './const.mjs';

export function getType(value) {
    switch (typeof value) {
        default:
            return TYPE_UNDEF;

        case 'boolean':
            return value ? TYPE_TRUE : TYPE_FALSE;

        case 'string':
            return TYPE_STRING;

        case 'number':
            return Number.isFinite(value) ? TYPE_NUMBER : TYPE_NULL;

        case 'object':
            return value === null
                ? TYPE_NULL
                : Array.isArray(value)
                    ? TYPE_ARRAY
                    : TYPE_OBJECT;
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
