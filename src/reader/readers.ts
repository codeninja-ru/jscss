import { BlockInputStream, InputStream, KindOfSpaceInputStream, LiteralInputStream, readToEnd } from "stream/input";
import { Position } from "stream/position";
import { CommaToken, SpaceToken, SymbolToken, Token, TokenType } from "token";

export type Reader = () => Token | null;

export function makeSpaceReader(stream: InputStream): Reader {
    return function() {
        if (KindOfSpaceInputStream.isKindOfSpace(stream.peek())) {
            return {
                type: TokenType.Space,
                position: stream.position(),
                value: readToEnd(new KindOfSpaceInputStream(stream)),
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
                position: stream.position(),
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
            const pos = stream.position();
            stream.next();
            return {
                type: TokenType.Symbol,
                position: pos,
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
                position: stream.position(),
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
                position: stream.position(),
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
            const pos = stream.position();
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
                        position: pos,
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

function takeWhile(stream: InputStream, fn: (ch: string) => boolean): [string, Position?] {
    if (fn(stream.peek())) {
        const pos = stream.position();
        let result = stream.next();

        while (!stream.isEof() && fn(stream.peek())) {
            result += stream.next();
        }

        return [result, pos];
    } else {
        return ['', undefined];
    }

}

const JS_SYMBOLS = ".=<>-*+&|^@%?:#!\\";

export function readSymbol(stream : InputStream, allowedSymbols = JS_SYMBOLS) : [string, Position?] {
    var symbolsFn = (ch: string) => {
        return allowedSymbols.includes(ch);
    };

    return takeWhile(stream, symbolsFn);
}

export function makeSymbolReader(stream: InputStream, allowedSymbols = JS_SYMBOLS): Reader {
    return function() {
        var ch = stream.peek();
        if (allowedSymbols.includes(ch)) {
            const pos = stream.position();
            stream.next();
            return {
                type: TokenType.Symbol,
                position: pos,
                value: ch
            } as SymbolToken;
        }

        return null;
    };
}

export function makeBracketsReader(stream: InputStream, startBracket: '(' | '[', endBracket: ')' | ']'): Reader {
    return function() {
        if (stream.peek() == startBracket) {
            let result = '';
            let level = 0;
            const pos = stream.position();
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
                        position: pos,
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
                        position: stream.position(),
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
