export const hasOwnProperty = Object.hasOwnProperty;
export const MAX_UINT_8  = 0x0000_00ff;
export const MAX_UINT_16 = 0x0000_ffff;
export const MAX_UINT_24 = 0x00ff_ffff;
export const MAX_UINT_28 = 0x0fff_ffff;
export const MAX_UINT_31 = 0x7fff_ffff;
export const MAX_UINT_32 = 0xffff_ffff;
export const MAX_VLQ_8   = 0x0000_007f;
export const MAX_VLQ_16  = 0x0000_3fff;
export const MAX_VLQ_24  = 0x001f_ffff;

export const ARRAY_ENCODING_DEFAULT = 0;
export const ARRAY_ENCODING_PROGRESSION = 1;
export const ARRAY_ENCODING_VLQ = 2;
export const ARRAY_ENCODING_VLQ2 = 3;
export const ARRAY_ENCODING_MIN_DIFF = 4;
export const ARRAY_ENCODING_ENUM = 5;
export const ARRAY_ENCODING_SINGLE_VALUE = 6;

// 1st byte of type bitmap (most common types)
export const TYPE_TRUE = 0;         // value-containing type
export const TYPE_FALSE = 1;        // value-containing type
export const TYPE_STRING = 2;
export const TYPE_UINT_8 = 3;       // [0 ... 255 (0xff)]
export const TYPE_UINT_16 = 4;      // [0 ... 65535 (0xffff)]
export const TYPE_UINT_24 = 5;      // [0 ... 16777215 (0xff_ffff)]
export const TYPE_UINT_32 = 6;      // [0 ... 4294967295 (0xffff_ffff)]
export const TYPE_UINT_32_VAR = 7;  // [4294967296 ... ]
// 2nd byte of type bitmap
export const TYPE_NEG_INT = 8;
export const TYPE_FLOAT_32 = 9;
export const TYPE_FLOAT_64 = 10;
export const TYPE_OBJECT = 11;
export const TYPE_ARRAY = 12;
export const TYPE_NULL = 13;        // value-containing type
// type 14 is reserved
// type 15 is reserved
// array non-storable types (out of 2-bytes type bitmap)
export const TYPE_UNDEF = 16;       // array non-storable & value-containing type

export const STORABLE_TYPES = 0xffff;
export const VALUE_CONTAINING_TYPE =
    (1 << TYPE_TRUE) |
    (1 << TYPE_FALSE) |
    (1 << TYPE_NULL) |
    (1 << TYPE_UNDEF);
export const ARRAY_NON_WRITABLE_TYPE =
    VALUE_CONTAINING_TYPE |
    (1 << TYPE_ARRAY) |
    (1 << TYPE_OBJECT);
export const UINT_TYPE =
    (1 << TYPE_UINT_8) |
    (1 << TYPE_UINT_16) |
    (1 << TYPE_UINT_24) |
    (1 << TYPE_UINT_32) |
    (1 << TYPE_UINT_32_VAR);
    // (1 << TYPE_NEG_INT);
export const ENUM_TYPE =
    (1 << TYPE_STRING) |
    (1 << TYPE_UINT_8) |
    (1 << TYPE_UINT_16) |
    (1 << TYPE_UINT_24) |
    (1 << TYPE_UINT_32) |
    (1 << TYPE_UINT_32_VAR);

export const LOW_BITS_TYPE = 0;
export const LOW_BITS_FLAGS = 1;

export const TYPE_NAME = Object.fromEntries(Object.entries({
    TYPE_TRUE, TYPE_FALSE,
    TYPE_STRING,
    TYPE_UINT_8, TYPE_UINT_16, TYPE_UINT_24, TYPE_UINT_32,
    TYPE_UINT_32_VAR, TYPE_NEG_INT,
    TYPE_FLOAT_32, TYPE_FLOAT_64,
    TYPE_OBJECT,
    TYPE_ARRAY,
    TYPE_NULL,
    TYPE_UNDEF,
    INLINED: 18,
    COLUMN: 19
}).map(([k, v]) => [v, k]));
