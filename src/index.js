module.exports = {
    version: require('../package.json').version,
    stringifyInfo: require('./stringify-info'),
    stringifyStream: require('./stringify-stream'),
    createChunkParser: require('./parse-stream')
};
