const STACK_OBJECT = 1;
const STACK_ARRAY = 2;
const STATE_NONE = 0;
const STATE_ANY = 1;
const STATE_OBJECT_ENTRY_START_OR_END = 2;
const STATE_OBJECT_ENTRY_COLON = 3;
const STATE_OBJECT_NEXT_OR_END = 4;
const STATE_ARRAY_NEXT_OR_END = 5;

module.exports = class StreamParser {
    constructor() {
        this.value = undefined;
        this.stack = null;
        this.state = STATE_ANY;
        this.pendingChunk = undefined;
        this.finished = false;
    }

    _decodeString(s) {
        return JSON.parse(s);
    }

    _pushValue(value) {
        if (this.stack === null) {
            this.value = value;
            this.finished = true;
            return;
        }

        switch (this.stack.type) {
            case STACK_OBJECT:
                this.stack.subject[this.stack.property] = value;
                this.state = STATE_OBJECT_NEXT_OR_END;
                break;

            case STACK_ARRAY:
                this.stack.subject.push(value);
                this.state = STATE_ARRAY_NEXT_OR_END;
                break;
        }
    }

    push(chunk, last) {
        if (this.finished) {
            return;
        }

        if (this.pendingChunk) {
            chunk = this.pendingChunk + chunk;
            this.pendingChunk = undefined;
        }

        for (let i = 0; i < chunk.length; i++) {
            // skip whitespace
            if (/[\r\n\t \u2028\u2029]/.test(chunk[i])) {
                continue;
            }

            if (this.finished) {
                this.error(chunk[i], i);
            }

            main: switch (this.state) {
                case STATE_ANY: {
                    switch (chunk[i]) {
                        case '-':
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9': {
                            debugger;
                            // consume number
                            let numEnd = i;
                            let part = 0; // 0 int, 1 mantise, 2 exp

                            if (chunk[i] === '-') {
                                numEnd++;
                            }

                            for (; numEnd < chunk.length; numEnd++) {
                                if (chunk[numEnd] === '.' && part === 0) {
                                    part = 1;
                                } else if ((chunk[numEnd] === 'e' || chunk[numEnd] === 'E') && part < 2) {
                                    if (numEnd + 1 < chunk.length && (chunk[numEnd + 1] === '-' || chunk[numEnd + 1] === '+')) {
                                        // sign
                                        numEnd++;
                                    }
                                    part = 2;
                                } else if (!/\d/.test(chunk[numEnd])) {
                                    this._pushValue(Number(chunk.slice(i, numEnd)));
                                    i = numEnd - 1;
                                    break main;
                                }
                            }

                            if (!last) {
                                this.pendingChunk = chunk.slice(i);
                                return;
                            }

                            this._pushValue(Number(chunk.slice(i)));
                            return;
                        }

                        case '"': {
                            // consume string
                            for (let j = i + 1; j < chunk.length; j++) {
                                if (chunk[j] === '\\') {
                                    j++;
                                } else if (chunk[j] === '"') {
                                    this._pushValue(this._decodeString(chunk.slice(i, j + 1)));
                                    i = j;
                                    break main;
                                }
                            }

                            if (!last) {
                                this.pendingChunk = chunk.slice(i);
                                return;
                            }

                            this.unexpectedEnd();
                        }

                        case 't':
                        case 'f':
                        case 'n': {
                            const word = chunk[i] === 't' ? 'true' : chunk[i] === 'f' ? 'false' : 'null';

                            if (i + word.length <= chunk.length) {
                                if (chunk.slice(i, i + word.length) === word) {
                                    this._pushValue(word === 'true' ? true : word === 'null' ? null : false);
                                    i += word.length - 1;
                                    break main;
                                }

                                this.error(chunk[i], i);
                            }

                            if (!last) {
                                this.pendingChunk = chunk.slice(i);
                                return;
                            }

                            this.error(chunk[i], i);
                        }

                        case '[': {
                            this.stack = {
                                type: STACK_ARRAY,
                                subject: [],
                                property: undefined,
                                prev: this.stack
                            };
                            break;
                        }

                        case '{': {
                            this.state = STATE_OBJECT_ENTRY_START_OR_END;
                            this.stack = {
                                type: STACK_OBJECT,
                                subject: {},
                                property: undefined,
                                prev: this.stack
                            };
                            break;
                        }

                        case ']':
                            if (this.stack !== null && this.stack.type === STACK_ARRAY) {
                                const array = this.stack.subject;
                                this.stack = this.stack.prev;
                                this._pushValue(array);
                                break;
                            }

                        default:
                            this.error(chunk[i], i);
                    }

                    break;
                }

                case STATE_OBJECT_ENTRY_START_OR_END: {
                    if (chunk[i] === '"') {
                        // consume string
                        for (let j = i + 1; j < chunk.length; j++) {
                            if (chunk[j] === '\\') {
                                j++;
                            } else if (chunk[j] === '"') {
                                this.stack.property = this._decodeString(chunk.slice(i, j + 1));
                                this.state = STATE_OBJECT_ENTRY_COLON;
                                i = j;
                                break main;
                            }
                        }

                        if (!last) {
                            this.pendingChunk = chunk.slice(i);
                            return;
                        }

                        this.unexpectedEnd();
                    }

                    // end
                    if (chunk[i] === '}') {
                        const object = this.stack.subject;
                        this.stack = this.stack.prev;
                        this._pushValue(object);
                        break;
                    }

                    this.error(chunk[i], i);
                }

                case STATE_OBJECT_ENTRY_COLON: {
                    if (chunk[i] === ':') {
                        this.state = STATE_ANY;
                        break;
                    }

                    this.error(chunk[i], i);
                }

                case STATE_OBJECT_NEXT_OR_END: {
                    // next
                    if (chunk[i] === ',') {
                        this.state = STATE_OBJECT_ENTRY_START_OR_END;
                        break;
                    }

                    // end
                    if (chunk[i] === '}') {
                        const object = this.stack.subject;
                        this.stack = this.stack.prev;
                        this._pushValue(object);
                        break;
                    }

                    this.error(chunk[i], i);
                }

                case STATE_ARRAY_NEXT_OR_END: {
                    // next
                    if (chunk[i] === ',') {
                        this.state = STATE_ANY;
                        break;
                    }

                    // end
                    if (chunk[i] === ']') {
                        const array = this.stack.subject;
                        this.stack = this.stack.prev;
                        this._pushValue(array);
                        break;
                    }

                    this.error(chunk[i], i);
                }

                case STATE_NONE:
                    this.error(chunk[i], i);
            }
        }

        if (last && !this.finished) {
            this.unexpectedEnd();
        }
    }

    finish() {
        this.push('', true);
        return this.value;
    }

    unexpectedEnd() {
        throw new SyntaxError('Unexpected end of JSON input');
    }

    error(token, pos) {
        throw new SyntaxError('Unexpected ' + token + ' in JSON at position ' + pos);
    }
};
