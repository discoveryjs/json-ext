export const hasOwnProperty = Object.hasOwnProperty;
export const MAX_UINT_8  = 0x0000_00ff;
export const MAX_UINT_16 = 0x0000_ffff;
export const MAX_UINT_24 = 0x00ff_ffff;
export const MAX_UINT_28 = 0x0fff_ffff;
export const MAX_UINT_30 = 0x3fff_ffff;
export const MAX_UINT_31 = 0x7fff_ffff;
export const MAX_UINT_32 = 0xffff_ffff;
export const MIN_INT_8   = -0x0000_007f;
export const MAX_INT_8   = 0x0000_007f;
export const MIN_INT_16  = -0x0000_7fff;
export const MAX_INT_16  = 0x0000_7fff;
export const MIN_INT_24  = -0x007f_ffff;
export const MAX_INT_24  = 0x007f_ffff;
export const MIN_INT_32  = -0x7fff_ffff;
export const MAX_INT_32  = 0x7fff_ffff;
export const MAX_VLQ_8   = 0x0000_007f;
export const MAX_VLQ_16  = 0x0000_3fff;
export const MAX_VLQ_24  = 0x001f_ffff;

// value types
export const TYPE_NONE   = 0;
export const TYPE_UNDEF  = 1 << 0;  // value-containing type, must be 0 (object's entry list ending)
export const TYPE_NULL   = 1 << 1;  // value-containing type
export const TYPE_NUMBER = 1 << 2;
export const TYPE_STRING = 1 << 3;
export const TYPE_OBJECT = 1 << 4;
export const TYPE_TRUE   = 1 << 5;  // value-containing type
export const TYPE_FALSE  = 1 << 6;  // value-containing type
export const TYPE_ARRAY  = 1 << 7;

// numeric types
export const UINT_8      = 0;  // [0 ... 255 (0xff)]
export const UINT_16     = 1;  // [0 ... 65535 (0xffff)]
export const UINT_24     = 2;  // [0 ... 16777215 (0xff_ffff)]
export const UINT_32     = 3;  // [0 ... 4294967295 (0xffff_ffff)]
export const UINT_32_VAR = 4;  // [4294967296 ... ]
export const FLOAT_32    = 5;
export const FLOAT_64    = 6;
export const DECIMAL     = 7;
export const INT_8       = 8;
export const INT_16      = 9;
export const INT_24      = 10;
export const INT_32      = 11;
export const INT_32_VAR  = 12;
export const UINT_BITS   = 0b0000_0000_0001_1111;
export const UINT_MASK   = ~UINT_BITS;
export const FLOAT_BITS  = 0b0000_0000_1110_0000;
export const FLOAT_MASK  = ~FLOAT_BITS;
export const INT_BITS    = 0b0001_1111_0000_0000;
export const INT_MASK    = ~INT_BITS;

// numeric encoding
export const ARRAY_ENCODING_TYPE_INDEX = 0;
export const ARRAY_ENCODING_INT_TYPE_INDEX = 1;
export const ARRAY_ENCODING_VLQ = 2;
export const ARRAY_ENCODING_INT_VLQ = 3;
export const ARRAY_ENCODING_VLQ2 = 4;
export const ARRAY_ENCODING_INT_VLQ2 = 5;
export const ARRAY_ENCODING_PROGRESSION = 6;
export const ARRAY_ENCODING_ENUM = 7;
export const ARRAY_ENCODING_SINGLE_TYPE = 8;
export const ARRAY_ENCODING_SINGLE_VALUE = 9;

export const ARRAY_LOWERING_DELTA = 0x10;
export const ARRAY_LOWERING_MIN = 0x20;

// type groups & packing
export const VALUE_CONTAINING_TYPE =
    // TYPE_UNDEF |
    TYPE_NULL |
    TYPE_TRUE |
    TYPE_FALSE;

export const PACK_TYPE = new Uint8Array(256);
export const UNPACK_TYPE = new Uint8Array(8).map((_, idx) => {
    PACK_TYPE[1 << idx] = idx;
    return 1 << idx;
});

export const BIT_COUNT = new Uint8Array(256).map((count, num) => {
    for (let j = 0; j < 8; j++) {
        count += num >> j & 1;
    }

    return count;
});

// type names
export const TYPE_NAME = Object.fromEntries(Object.entries({
    TYPE_UNDEF,
    TYPE_TRUE,
    TYPE_FALSE,
    TYPE_NULL,
    TYPE_NUMBER,
    TYPE_STRING,
    TYPE_OBJECT,
    TYPE_ARRAY
}).map(([k, v]) => [v, k]));
export const NUM_TYPE_NAME = Object.fromEntries(Object.entries({
    UINT_8, UINT_16, UINT_24, UINT_32, UINT_32_VAR,
    INT_8, INT_16, INT_24, INT_32, INT_32_VAR,
    FLOAT_32, FLOAT_64, DECIMAL
}).map(([k, v]) => [v, k]));
