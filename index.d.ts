declare module '@discoveryjs/json-ext' {
    import { Readable } from 'stream';

    type TReplacer = null | string[] | number[] | ((this: any, key: string, value: any) => any);
    type TSpace = string | number | null;


    export function parseChunked(input: Readable | Generator<any, void, void> | AsyncGenerator<any, void, void> | (() => (Iterable<any> | AsyncIterable<any>))): Promise<any>;

    export function stringifyStream(value: any, replacer?: TReplacer, space?: TSpace): Readable;

    export function stringifyInfo(
        value: any,
        replacer?: TReplacer,
        space?: TSpace,
        options?: {
            async?: boolean;
            continueOnCircular?: boolean;
        }
    ): {
        minLength: number;
        circular: any[];
        duplicate: any[];
        async: any[];
    };
  }
