declare module '@discoveryjs/json-ext' {
    type Chunk = string | Uint8Array | Buffer;

    type Reviver = (this: any, key: string, value: any) => any;
    type ParseChunkState = {
        readonly mode: 'json' | 'jsonl';
        readonly rootValuesCount: number;
        readonly consumed: number;
        readonly parsed: number;
    };
    type OnRootValue = (value: any, state: ParseChunkState) => void;
    type OnChunk = (chunkParsed: number, chunk: string | null, pending: string | null, state: ParseChunkState) => void;
    type ParseOptions = {
        reviver?: Reviver;
        mode?: 'json' | 'jsonl' | 'ndjson' | 'auto';
        onRootValue?: OnRootValue;
        onChunk?: OnChunk;
    };

    type Replacer =
        | ((this: any, key: string, value: any) => any)
        | (string | number)[]
        | null;
    type Space = string | number | null;
    type StringifyOptions = {
        replacer?: Replacer;
        space?: Space;
        highWaterMark?: number;
    }
    type StringifyInfoOptions = {
        replacer?: Replacer;
        space?: Space;
        continueOnCircular?: boolean;
    }
    type StringifyInfoResult = {
        bytes: number;
        spaceBytes: number;
        circular: object[];
    };

    export function parseChunked(input: Iterable<Chunk> | AsyncIterable<Chunk>, reviver?: Reviver): Promise<any>;
    export function parseChunked(input: Iterable<Chunk> | AsyncIterable<Chunk>, options: ParseOptions & { onRootValue: OnRootValue }): Promise<number>;
    export function parseChunked(input: Iterable<Chunk> | AsyncIterable<Chunk>, options?: ParseOptions): Promise<any>;
    export function parseChunked(input: () => (Iterable<Chunk> | AsyncIterable<Chunk>), reviver?: Reviver): Promise<any>;
    export function parseChunked(input: () => (Iterable<Chunk> | AsyncIterable<Chunk>), options: ParseOptions & { onRootValue: OnRootValue }): Promise<number>;
    export function parseChunked(input: () => (Iterable<Chunk> | AsyncIterable<Chunk>), options?: ParseOptions): Promise<any>;

    export function stringifyChunked(value: any, replacer?: Replacer, space?: Space): Generator<string>;
    export function stringifyChunked(value: any, options: StringifyOptions): Generator<string>;

    export function stringifyInfo(value: any, replacer?: Replacer, space?: Space): StringifyInfoResult;
    export function stringifyInfo(value: any, options?: StringifyInfoOptions): StringifyInfoResult;

    // Web streams
    export function parseFromWebStream(stream: ReadableStream<Chunk>): Promise<any>;
    export function createStringifyWebStream(value: any, replacer?: Replacer, space?: Space): ReadableStream<string>;
    export function createStringifyWebStream(value: any, options: StringifyOptions): ReadableStream<string>;
}
