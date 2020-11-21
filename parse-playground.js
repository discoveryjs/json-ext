const ParseStream = require('./src/parse-stream');
const data = require('fs').readFileSync('./benchmarks/fixture/big.json', 'utf8');
const parser = new ParseStream();
const chunkSize = 1 * 1024 * 1024;

console.time('parse');
for (let i = 0; i < data.length; i += chunkSize) {
    parser.push(data.slice(i, i + chunkSize));
}
const result = parser.finish();
console.timeEnd('parse');

console.time('parse native');
const result2 = JSON.parse(data);
console.timeEnd('parse native');

require('assert').deepStrictEqual(result, result2);

// console.time('parse');
// require('fs').createReadStream()
//     .on('data', chunk => parser.push(String(chunk)))
//     .on('end', () => {
//         const result = parser.finish();
//         console.timeEnd('parse');
//         // console.log(result);
//     });
