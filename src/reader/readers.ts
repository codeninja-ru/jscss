import { BlockInputStream, InputStream, KindOfSpaceInputStream, LiteralInputStream, readToEnd } from "stream/input";
import { Token, TokenType, SpaceToken, SemicolonToken, CommaToken } from "token";

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

function takeWhile(stream: InputStream, fn: (ch: string) => boolean): string {
    var result = '';

    while (!stream.isEof() && fn(stream.peek())) {
        result += stream.next();
    }

    return result;
}

export function makeSymboleReader(stream: InputStream): Reader {
    return function() {
        var symbolsFn = (ch: string) => {
            return ".=<>-*+&|^@".includes(ch);
        };

        var result = takeWhile(stream, symbolsFn);

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

export function makeSemicolonRader(stream: InputStream): Reader {
    return function() {
        if (stream.peek() == ';') {
            return {
                type: TokenType.Semicolon,
                value: stream.next(),
            } as SemicolonToken;
        }

        return null;
    }
}

/**
 * does nothing, throws an error
 * @param stream 
 * @param error error message
 * @returns 
 */
export function makeUnexpectedSymbolReader(stream: InputStream): Reader {
    return function() {
        var ch = stream.peek();
        throw stream.formatError(`unexpected symbol '${ch}' code: ${ch.charCodeAt(0)}`);
    }
}
