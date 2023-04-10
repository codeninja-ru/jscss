import { LexerError } from "parser/parserError";
import { BlockInputStream, InputStream, LiteralInputStream, readToEnd } from "stream/input";
import { SpaceToken, SymbolToken, Token, TokenType } from "token";

export type ReaderResult = Token | null;
export type Reader = (stream : InputStream) => ReaderResult;

function readUntil(input: InputStream, checkFn : (ch : string) => boolean): string {
    var result = '';
    while (!input.isEof() && checkFn(input.peek())) {
        result += input.next();
    }

    return result;
}
function isKindOfSpace(ch: string) : boolean {
    return ch.charCodeAt(0) <= 32;
}

export function spaceReader(stream: InputStream) : ReaderResult {
    if (isKindOfSpace(stream.peek())) {
        const pos = stream.position();
        return {
            type: TokenType.Space,
            position: pos,
            value: readUntil(stream, isKindOfSpace),
        } as SpaceToken;
    }

    return null;
}

export function literalReader(stream: InputStream) : ReaderResult {
    if (LiteralInputStream.isLiteral(stream.peek())) {
        return {
            type: TokenType.Literal,
            position: stream.position(),
            value: readToEnd(new LiteralInputStream(stream))
        } as Token;
    }

    return null;
}

export function blockReader(stream: InputStream) : ReaderResult {
    if (BlockInputStream.isBlockStart(stream.peek())) {
        return {
            type: TokenType.LazyBlock,
            position: stream.position(),
            value: readToEnd(new BlockInputStream(stream)),
        } as Token;
    }
    return null;
}

const ESCAPE_SYMBOL = '\\';

export function makeStringReader(quatation: "'" | '"') : Reader {
    return function(stream : InputStream) : ReaderResult {
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
                if (ch == ESCAPE_SYMBOL) {
                    isEscapeMode = !isEscapeMode;
                } else {
                    isEscapeMode = false;
                }
            }

            throw new LexerError('unexpected end of the string', stream);
        }

        return null;
    };
}

export const JS_SYMBOLS = ";.,=<>-*+&|^@%?:#!~\\<>"; //TODO sort according statistic of usage

export function makeSymbolReader(allowedSymbols = JS_SYMBOLS): Reader {
    return function(stream : InputStream) : ReaderResult {
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

export function makeBracketsReader(startBracket: '(' | '[', endBracket: ')' | ']'): Reader {
    return function(stream : InputStream) : ReaderResult {
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
            throw new LexerError('brackets do not match', stream);
        }

        return null;
    };
}

export function templateStringReader(stream: InputStream) : ReaderResult {
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

        throw new LexerError('unexpected end of the template string', stream);
    }

    return null;
}

/**
 * does nothing, throws an error
 * @param stream
 * @param error error message
 * @returns
 */
export function unexpectedReader(stream: InputStream) : ReaderResult {
    var ch = stream.peek();
    throw new LexerError(`unexpected symbol '${ch}' code: ${ch.charCodeAt(0)}`, stream);
}
