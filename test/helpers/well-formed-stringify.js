// TODO: Remove when drop support for Node.js 10
// Node.js 10 has no well-formed JSON.stringify()
// https://github.com/tc39/proposal-well-formed-stringify
// Adopted code from https://bugs.chromium.org/p/v8/issues/detail?id=7782#c12
export function wellformedStringify(...args) {
    let json = JSON.stringify(...args);

    if (typeof json === 'string') {
        json = json.replace(
            /\p{Surrogate}/gu,
            m => `\\u${m.charCodeAt(0).toString(16)}`
        );
    }

    return json;
};
