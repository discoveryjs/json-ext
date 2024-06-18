/* eslint-env browser */
import assert from 'assert';
import { createStringifyWebStream, parseFromWebStream } from '@discoveryjs/json-ext';

const describeIfSupported = typeof ReadableStream === 'function' ? describe : describe.skip;

function createReadableStream(chunks) {
    chunks = [...chunks];

    return new ReadableStream({
        pull(controller) {
            if (chunks.length > 0) {
                controller.enqueue(chunks.shift());
            } else {
                controller.close();
            }
        }
    });
}

async function consumeWebStreamChunks(stream) {
    const reader = stream.getReader();
    const chunks = [];

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
    }

    return chunks;
}

describeIfSupported('parseFromWebStream()', () => {
    it('should parse ReadableStream', async () => {
        const actual = await parseFromWebStream(createReadableStream(['{"foo', '":123', '}']));

        assert.deepStrictEqual(actual, { foo: 123 });
    });
});

describeIfSupported('createStringifyWebStream()', () => {
    it('default settings', async () => {
        const actual = await consumeWebStreamChunks(createStringifyWebStream({ foo: 123, bar: 456 }));

        assert.deepStrictEqual(actual, [
            '{"foo":123,"bar":456}'
        ]);
    });

    it('basic settings', async () => {
        const actual = await consumeWebStreamChunks(createStringifyWebStream({ foo: 123, bar: 456 }, ['foo'], 2));

        assert.deepStrictEqual(actual, [
            '{\n  "foo": 123\n}'
        ]);
    });

    it('custom highWaterMark', async () => {
        const actual = await consumeWebStreamChunks(createStringifyWebStream({ foo: 123, bar: 456 }, {
            highWaterMark: 1
        }));

        assert.deepStrictEqual(actual, [
            '{',
            '"foo":123',
            ',"bar":456',
            '}'
        ]);
    });

    it('custom options', async () => {
        const actual = await consumeWebStreamChunks(createStringifyWebStream({ foo: 123, bar: 456 }, {
            highWaterMark: 1,
            replacer: ['foo'],
            space: 4
        }, 2));

        assert.deepStrictEqual(actual, [
            '{',
            '\n    "foo": 123',
            '\n}'
        ]);
    });
});
