const { fork } = require('child_process');
const validate = false;
const fixtures = [
    /* eslint-disable comma-dangle */
    './fixture/small.json',
    './fixture/medium.json',
    './fixture/big.json',
    /* eslint-enable comma-dangle */
];

function runTest(filepath) {
    return new Promise((resolve, reject) => {
        fork('binary.js', validate ? [filepath, '--validate'] : [filepath])
            .on('message', resolve)
            .on('close', code => {
                if (code) {
                    reject(new Error('Process exit with code ' + code));
                }

                reject(new Error('No message with results'));
            });
    });
}

function size(value) {
    return value && isFinite(value) ? String(value).replace(/\.\d+(eE[-+]?\d+)?|\B(?=(\d{3})+(\D|$))/g, m => m || ',') : '–';
}

function time(value) {
    return isFinite(value) ? String(value) + 'ms' : '–';
}

async function run() {
    const results = Object.create(null);

    for (const filepath of fixtures) {
        results[filepath] = await runTest(filepath);
    }

    // console.dir(results);

    const maxFieldLen = Object.create(null);
    const fmtField = (data, key, left) => data[key][left ? 'padEnd' : 'padStart'](maxFieldLen[key] - /[✅]/.test(data[key]));
    const applyMaxFieldLen = fmt => Object.entries(fmt).forEach(([key, value]) =>
        maxFieldLen[key] = Math.max(maxFieldLen[key] || 0, value.length + /[✅]/.test(value))
    );

    for (const run of Object.values(results)) {
        for (const data of run) {
            data.fmt = {
                name: data.name + (data.valid === null ? '' : data.valid ? ' ✅' : ' 💀'),
                encodedSize: size(data.size.encoded),
                encodedMem: size(data.encodedMem),
                gzipSize: size(data.size.gzip),
                encodeTime: time(data.time.encode),
                decodeTime: time(data.time.decode),
                encodeDecodeTime: time(data.time.encode + data.time.decode),
                gzipTime: time(data.time.gzip),
                gunzipTime: time(data.time.gunzip),
                totalTime: time(
                    data.time.encode +
                    data.time.decode +
                    data.time.gzip +
                    data.time.gunzip
                )
            };

            applyMaxFieldLen(data.fmt);
        }
    }

    const header = {
        name: 'Solution',
        encodedSize: 'Encoded',
        encodedMem: 'Enc heap',
        gzipSize: 'Gziped',
        encodeTime: 'Encode',
        decodeTime: 'Decode',
        encodeDecodeTime: 'Enc+Dec',
        gzipTime: 'Gzip',
        gunzipTime: 'Gunzip',
        totalTime: 'Total'
    };
    const drawLine = (s, m, e) => console.log(
        s +
        '─'.repeat(maxFieldLen.name + 2) +
        m +
        '─'.repeat(maxFieldLen.encodedSize + 2) +
        m +
        '─'.repeat(maxFieldLen.encodeTime + 2) +
        m +
        '─'.repeat(maxFieldLen.decodeTime + 2) +
        // m +
        // '─'.repeat(maxFieldLen.encodedMem + 2) +
        m +
        '─'.repeat(maxFieldLen.encodeDecodeTime + 2) +
        m +
        '─'.repeat(maxFieldLen.gzipSize + 2) +
        m +
        '─'.repeat(maxFieldLen.gzipTime + 2) +
        m +
        '─'.repeat(maxFieldLen.gunzipTime + 2) +
        m +
        '─'.repeat(maxFieldLen.totalTime + 2) +
        e
    );
    const drawRow = (data, left) => console.log(
        '│',
        fmtField(data, 'name', true),
        '│',
        fmtField(data, 'encodedSize', left),
        '│',
        fmtField(data, 'encodeTime', left),
        '│',
        fmtField(data, 'decodeTime', left),
        // '│',
        // fmtField(data, 'encodedMem', left),
        '│',
        fmtField(data, 'encodeDecodeTime', left),
        '│',
        fmtField(data, 'gzipSize', left),
        '│',
        fmtField(data, 'gzipTime', left),
        '│',
        fmtField(data, 'gunzipTime', left),
        '│',
        fmtField(data, 'totalTime', left),
        '│'
    );

    applyMaxFieldLen(header);

    for (const [filepath, run] of Object.entries(results)) {
        console.log();
        console.log(filepath);
        drawLine('┌', '┬', '┐');
        drawRow(header, true);
        drawLine('├', '┼', '┤');

        for (const solution of run) {
            drawRow(solution.fmt);
        }

        drawLine('└', '┴', '┘');
    }
}

run();
