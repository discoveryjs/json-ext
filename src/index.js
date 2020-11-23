module.exports = {
    version: require('../package.json').version,
    stringifyInfo: require('./stringify-info'),
    stringifyStream: require('./stringify-stream'),
    parseStream: require('./parse-stream')
};
