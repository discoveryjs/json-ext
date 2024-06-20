import fs from 'node:fs';

fs.rmSync('deno-tests', { recursive: true, force: true });
fs.mkdirSync('deno-tests');

for (const filename of fs.readdirSync('src')) {
    const source = fs.readFileSync(`src/${filename}`, 'utf8')
        .replace(/from '(assert|buffer|fs|stream|timers|util)'/g, 'from \'node:$1\'');

    fs.writeFileSync(`deno-tests/${filename}`, source);
}
