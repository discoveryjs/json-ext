const { Readable } = require('stream');
const {
    normalizeReplacer,
    normalizeSpace,
    getTypeAsync,
    type: {
        PRIMITIVE,
        OBJECT,
        ARRAY,
        PROMISE,
        STRING_STREAM,
        OBJECT_STREAM
    }
} = require('./utils');
const noop = () => {};
const needToEscape = /[\x00-\x1f\uD800-\uffff]/;

function quoteJSONString(str) {
    if (needToEscape.test(str)) {
        return JSON.stringify(str);
    }

    return '"' + str + '"';
}

function primitiveToString(value) {
    switch (typeof value) {
        case 'string':
            return quoteJSONString(value);

        case 'number':
            return Number.isFinite(value) ? value : 'null';

        case 'boolean':
            return value;

        case 'undefined':
        case 'object':
            return 'null';

        default:
            // this should never happen
            throw new Error(`Unknown type "${typeof value}". Please file an issue!`);
    }
}

function push() {
    this.push(this._stack.value);
    this.popStack();
}

function processObjectEntry(key) {
    const current = this._stack;

    if (!current.first) {
        current.first = true;
    } else {
        this.push(',');
    }

    if (this.space) {
        this.push(`\n${this.space.repeat(this._depth)}${quoteJSONString(key)}: `);
    } else {
        this.push(quoteJSONString(key) + ':');
    }
}

function processObject() {
    const current = this._stack;

    // when no keys left, remove obj from stack
    if (current.index === current.keys.length) {
        if (this.space && current.first) {
            this.push(`\n${this.space.repeat(this._depth - 1)}}`);
        } else {
            this.push('}');
        }

        this.popStack();
        return;
    }

    const key = current.keys[current.index];

    this.processValue(key, current.value[key], processObjectEntry);
    current.index++;
}

function processArrayItem(index) {
    if (index !== 0) {
        this.push(',');
    }

    if (this.space) {
        this.push(`\n${this.space.repeat(this._depth)}`);
    }
}

function processArray() {
    const current = this._stack;

    if (current.index === current.value.length) {
        if (this.space && current.index > 0) {
            this.push(`\n${this.space.repeat(this._depth - 1)}]`);
        } else {
            this.push(']');
        }

        this.popStack();
        return;
    }

    this.processValue(current.index, current.value[current.index], processArrayItem);
    current.index++;
}

function createStreamReader(fn) {
    return function() {
        const current = this._stack;
        const data = current.value.read(this._readSize);

        if (data !== null) {
            current.first = false;
            fn.call(this, data, current);
        } else {
            if (current.first && !current.value._readableState.reading) {
                this.popStack();
            } else {
                current.first = true;
                current.awaiting = true;
            }
        }
    };
}

const processReadableObject = createStreamReader(function(data, current) {
    this.processValue(current.index, data, processArrayItem);
    current.index++;
});

const processReadableString = createStreamReader(function(data) {
    this.push(data);
});

class JsonStringifyStream extends Readable {
    constructor(value, replacer, space) {
        super({});

        this.replacer = normalizeReplacer(replacer);
        this.space = normalizeSpace(space);
        this._depth = 0;

        this.error = null;
        this._processing = false;
        this._ended = false;

        this._readSize = 0;
        this._buffer = '';

        this._stack = null;
        this._visited = new WeakSet();

        this.pushStack({
            handler: () => {
                this.popStack();
                this.processValue('', value, noop);
            }
        });
    }

    processValue(key, value, callback) {
        if (value && typeof value.toJSON === 'function') {
            value = value.toJSON();
        }

        if (this.replacer !== null) {
            value = this.replacer.call(null, String(key), value);  // FIXME: `this` should be current value
        }

        if (typeof value === 'function' || typeof value === 'symbol') {
            value = undefined;
        }

        let type = getTypeAsync(value);

        switch (type) {
            case PRIMITIVE:
                if (callback !== processObjectEntry || value !== undefined) {
                    callback.call(this, key);
                    this.push(primitiveToString(value));
                }
                break;

            case OBJECT:
                callback.call(this, key);

                // check for circular structure
                if (this._visited.has(value)) {
                    return this.abort(new Error('Converting circular structure to JSON'));
                }

                this._visited.add(value);
                this._depth++;
                this.push('{');
                this.pushStack({
                    handler: processObject,
                    value,
                    index: 0,
                    first: false,
                    keys: Object.keys(value)
                });
                break;

            case ARRAY:
                callback.call(this, key);

                // check for circular structure
                if (this._visited.has(value)) {
                    return this.abort(new Error('Converting circular structure to JSON'));
                }

                this._visited.add(value);

                this.push('[');
                this.pushStack({
                    handler: processArray,
                    value,
                    index: 0
                });
                this._depth++;
                break;

            case PROMISE:
                this.pushStack({
                    handler: noop,
                    awaiting: true
                });

                Promise.resolve(value)
                    .then(resolved => {
                        this.popStack();
                        this.processValue(key, resolved, callback);
                        this.processStack();
                    })
                    .catch(error => {
                        this.abort(error);
                    });
                break;

            case STRING_STREAM:
            case OBJECT_STREAM:
                callback.call(this, key);

                if (value.readableEnded) {
                    return this.abort(new Error('Readable Stream has ended before it was serialized. All stream data have been lost'));
                }

                if (value.readableFlowing) {
                    return this.abort(new Error('Readable Stream is in flowing mode, data may have been lost. Trying to pause stream.'));
                }

                if (type === OBJECT_STREAM) {
                    this.push('[');
                    this.pushStack({
                        handler: push,
                        value: this.space ? '\n' + this.space.repeat(this._depth) + ']' : ']'
                    });
                    this._depth++;
                }

                const self = this.pushStack({
                    handler: type === OBJECT_STREAM ? processReadableObject : processReadableString,
                    value,
                    index: 0,
                    first: false,
                    awaiting: !value.readable || value.readableLength === 0
                });
                const continueProcessing = () => {
                    if (self.awaiting) {
                        self.awaiting = false;

                        if (this._stack === self) {
                            this.processStack();
                        }
                    }
                };

                value.once('error', error => this.abort(error));
                value.once('end', continueProcessing);
                value.on('readable', continueProcessing);
                break;
        }
    }

    abort(error) {
        this.error = error;
        this._stack = null;
        this._processing = false;
        this._ended = true;

        process.nextTick(() => {
            this._buffer = null;
            this.emit('error', error);
            this.push(null);
        });
    }

    pushStack(node) {
        node.prev = this._stack;
        return this._stack = node;
    }

    popStack() {
        const { handler, value } = this._stack;

        if (handler === processObject || handler === processArray || handler === processReadableObject) {
            this._visited.delete(value);
            this._depth--;
        }

        this._stack = this._stack.prev;
    }

    processStack() {
        if (this._processing || this._ended) {
            return;
        }

        try {
            this._processing = true;

            while (this._stack !== null && !this._stack.awaiting) {
                this._stack.handler.call(this);

                if (!this._processing) {
                    return;
                }
            }

            this._processing = false;
        } catch (error) {
            this.abort(error);
            return;
        }

        if (this._stack === null && !this._ended) {
            this._ended = true;

            if (this._buffer.length) {
                super.push(this._buffer); // flush buffer
            }

            this.push(null);
            this._buffer = null;
        }
    }

    push(data) {
        if (data !== null) {
            this._buffer += data;

            // check buffer overflow
            if (this._buffer.length < this._readSize) {
                return;
            }

            // flush buffer
            data = this._buffer;
            this._buffer = '';
            this._processing = false;
        }

        super.push(data);
    }

    _read(size) {
        if (this._ended) {
            return;
        }

        this._readSize = size || this.readableHighWaterMark;

        // start processing
        this.processStack();
    }
}

module.exports = function createJsonStringifyStream(value, replacer, space) {
    return new JsonStringifyStream(value, replacer, space);
};
