import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import stringifyStream from '../src/stringify-stream.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pattern = __dirname + '/fixture/big.json';

module.exports = function(times, stream) {
    const size = fs.statSync(pattern).size;
    const padString = 'x'.repeat((1e8 - size) - 2 /* , */ - 2 /* "" */);
    const data = Array.from({ length: times * 2 }).map(
        (_, idx) => idx % 2
            ? (idx === 1 ? padString.slice(1) : padString)
            : fs.createReadStream(pattern)
    );

    console.error(
        'Generate',
        times < 10 ? `${times}00mb` : `${(times / 10).toFixed(1).replace(/\.0$/, '')}gb`,
        'fixture'
    );

    return new Promise((resolve, reject) => {
        stringifyStream(data)
            .on('error', reject)
            .pipe(typeof stream === 'string' ? fs.createWriteStream(stream) : stream)
            .on('error', reject)
            .on('finish', resolve);
    });
};

if (require.main === module) {
    const times = Math.max(parseInt(process.argv[2] || 5) || 5, 1);
    module.exports(times).pipe(process.stdout);
}
