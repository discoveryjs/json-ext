import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { finished } from 'node:stream/promises';
import { isMain } from './benchmark-utils.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pattern = __dirname + '/fixture/big.json';

export async function genFixture(times, stream) {
    const size = fs.statSync(pattern).size;
    const padString = 'x'.repeat((1e8 - size) - 2 /* , */ - 2 /* "" */);

    console.error(
        'Generate',
        times < 10 ? `${times}00mb` : `${(times / 10).toFixed(1).replace(/\.0$/, '')}gb`,
        'fixture'
    );

    if (typeof stream === 'string') {
        stream = fs.createWriteStream(stream);
    }

    stream.write('[');

    for (let i = 0; i < times * 2; i++) {
        if (i > 0) {
            stream.write(',');
        }

        if (i % 2) {
            stream.write('"' + (i === 1 ? padString.slice(1) : padString) + '"');
        } else {
            for await (let chunk of fs.createReadStream(pattern)) {
                stream.write(chunk);
            }
        }
    }

    await finished(
        stream.end(']')
    );

    return stream.bytesWritten;
};

if (isMain(import.meta)) {
    const times = Math.max(parseInt(process.argv[2] || 5) || 5, 1);
    genFixture(times, process.stdout);
}
