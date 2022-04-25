import { BlockInputStream, InputStream, KindOfSpaceInputStream, LiteralInputStream, readToEnd } from "stream/input";
import { CommaToken, SpaceToken, SymbolToken, Token, TokenType } from "token";

export type Reader = () => Token | null;

export function makeSpaceReader(stream: InputStream): Reader {
    return function() {
        if (KindOfSpaceInputStream.isKindOfSpace(stream.peek())) {
            return {
                type: TokenType.Space,
                value: readToEnd(new KindOfSpaceInputStream(stream))
            } as SpaceToken;
        }

        return null;
    };
}

export function makeCommaReader(stream: InputStream): Reader {
    return function() {
        var ch = stream.peek();
        if (ch == ',') {
            stream.next();
            return {
                type: TokenType.Comma,
                value: ','
            } as CommaToken;
        }

        return null;
    };
}

export function makeSemicolonReader(stream: InputStream): Reader {
    return function() {
        var ch = stream.peek();
        if (ch == ';') {
            stream.next();
            return {
                type: TokenType.Symbol,
                value: ';'
            } as SymbolToken;
        }

        return null;
    };
}

export function makeLiteralReader(stream: InputStream): Reader {
    return function() {
        if (LiteralInputStream.isLiteral(stream.peek())) {
            return {
                type: TokenType.Literal,
                value: readToEnd(new LiteralInputStream(stream))
            } as Token;
        }

        return null;
    };
}

export function makeBlockReader(stream: InputStream): Reader {
    return function() {
        if (BlockInputStream.isBlockStart(stream.peek())) {
            return {
                type: TokenType.LazyBlock,
                value: readToEnd(new BlockInputStream(stream)),
            } as Token;
        }
        return null;
    };
}

export function makeStringReader(stream: InputStream, quatation: "'" | '"'): Reader {
    const ESCAPE_SYMBOL = '\\';
    return function() {
        if (stream.peek() == quatation) {
            var result = stream.next();
            var isEscapeMode = false;
            while (!stream.isEof()) {
                var ch = stream.next();
                if (ch == '\n') {
                    break;
                }
                result += ch;
                if (!isEscapeMode && ch == quatation) {
                    return {
                        type: TokenType.String,
                        value: result,
                    } as Token;
                }
                isEscapeMode = ch == ESCAPE_SYMBOL;
            }

            throw stream.formatError('unexpected end of the string');
        }

        return null;
    };
}

export function makeRegExpReader(stream: InputStream): Reader {
    //TODO it's almost identical to to makeStringReader
    const ESCAPE_SYMBOL = '\\';
    const SLASH = '/';
    return function() {
        if (stream.peek() == SLASH) {
            var result = stream.next();
            var isEscapeMode = false;
            while (!stream.isEof()) {
                var ch = stream.next();
                if (ch == '\n') {
                    break;
                }
                result += ch;
                if (!isEscapeMode && ch == SLASH) {
                    if (result.length > 2) { // regexp can't be empty (//)
                        return {
                            type: TokenType.SlashBrackets,
                            value: result,
                        } as Token;
                    } else {
                        return null;
                    }
                }
                isEscapeMode = ch == ESCAPE_SYMBOL;
            }

            throw stream.formatError('unexpected end of the regexp');
        }

        return null;
    };
}

function takeWhile(stream: InputStream, fn: (ch: string) => boolean): string {
    var result = '';

    while (!stream.isEof() && fn(stream.peek())) {
        result += stream.next();
    }

    return result;
}

export function readSymbol(stream : InputStream) : string {
    var symbolsFn = (ch: string) => {
        return ".=<>-*+&|^@?:#!".includes(ch);
    };

    return takeWhile(stream, symbolsFn);
}

export function makeSymbolReader(stream: InputStream): Reader {
    return function() {
        var result = readSymbol(stream);

        if (result.length > 0) {
            return {
                type: TokenType.Symbol,
                value: result
            } as Token;
        }

        return null;
    };
}

export function makeBracketsReader(stream: InputStream, startBracket: '(' | '[', endBracket: ')' | ']'): Reader {
    return function() {
        if (stream.peek() == startBracket) {
            let result = '';
            let level = 0;
            while (!stream.isEof()) {
                var ch = stream.next();
                if (ch == startBracket) {
                    level++;
                } else if (ch == endBracket) {
                    level--;
                }
                result += ch;
                if (level == 0) {
                    return {
                        type: startBracket == '(' ? TokenType.RoundBrackets : TokenType.SquareBrackets,
                        value: result
                    } as Token;
                }
            }
            throw stream.formatError('brackets does not match');
        }

        return null;
    };
}

export function makeTemplateStringReader(stream: InputStream): Reader {
    const ESCAPE_SYMBOL = '\\';
    return function() {
        if (stream.peek() == '`') {
            var result = stream.next();
            var isEscapeMode = false;
            while (!stream.isEof()) {
                var ch = stream.next();
                result += ch;
                if (isEscapeMode) {
                    isEscapeMode = false;
                } else if (ch == '`') {
                    return {
                        type: TokenType.TemplateString,
                        value: result,
                    } as Token;
                } else if (ch == ESCAPE_SYMBOL) {
                    isEscapeMode = true;
                }
            }

            throw stream.formatError('unexpected end of the string');
        }

        return null;
    };
}

/**
 * does nothing, throws an error
 * @param stream 
 * @param error error message
 * @returns 
 */
export function makeUnexpectedReader(stream: InputStream): Reader {
    return function() {
        var ch = stream.peek();
        throw stream.formatError(`unexpected symbol '${ch}' code: ${ch.charCodeAt(0)}`);
    }
}
