import { LexerError } from "parser/parserError";
import { BlockInputStream, InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
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

function isKindOfSpaceChar(ch: string) : boolean {
    return ch.charCodeAt(0) <= 32;
}

export function spaceReader(stream: InputStream) : ReaderResult {
    if (isKindOfSpaceChar(stream.peek())) {
        const pos = stream.position();
        return {
            type: TokenType.Space,
            position: pos,
            value: readUntil(stream, isKindOfSpaceChar),
        } as SpaceToken;
    }

    return null;
}

function isLiteralChar(ch : string) : boolean {
    const code = ch.charCodeAt(0);
    return (code >= 48 && code <= 57) // 0-9
        || (code >= 97 && code <= 122) // a-z
        || (code >= 65 && code <= 90) // A-Z
        || code == 36 || code == 95; // $ _
    //return /^[0-9a-zA-Z\$\_]/.test(ch);
}

export function literalReader(stream: InputStream) : ReaderResult {
    if (isLiteralChar(stream.peek())) {
        return {
            type: TokenType.Literal,
            position: stream.position(),
            value: readUntil(stream, isLiteralChar),
        } as Token;
    }

    return null;
}

export function jssLiteralReader(stream: InputStream) : ReaderResult {
    if (isLiteralChar(stream.peek())) {
        const pos = stream.position();
        var result = '';
        if (stream.peek() == '$' && stream.lookahead() == '{') {
            return null;
        }
        while (!stream.isEof() && isLiteralChar(stream.peek())) {
            if (stream.peek() == '$' && stream.lookahead() == '{') {
                break;
            } else {
                result += stream.next();
            }
        }

        return {
            type: TokenType.Literal,
            position: pos,
            value: result,
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
    return function stringReaderInst(stream : InputStream) : ReaderResult {
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

            throw new LexerError(`unexpected end of the string, started at (${pos.line} : ${pos.col})`, stream);
        }

        return null;
    };
}

const JS_SYMBOLS = ";.,=<>-*+&|^@%?:#!~\\<>$"; //TODO sort according statistic of usage

export function makeSymbolReader(allowedSymbols = JS_SYMBOLS): Reader {
    return function symbolReaderInst(stream : InputStream) : ReaderResult {
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

function readSkippingComment(stream : InputStream) : string {
    if (stream.isEof()) {
        throw new LexerError('unexpected end of brackets', stream);
    }
    const ch = stream.peek();

    if (ch == '/') {
        stream.next();
        return ch + readToEnd(new TillEndOfLineStream(stream));
    } else if (ch == '*') {
        stream.next();
        return ch + stream.readUntil('*/');
    } else {
        return '';
    }
}

function readSkippingStrings(stringChar : string,
                             stream : InputStream) : string {
    let result = stringChar;
    let isEscape = false;
    const pos = stream.position();

    while(!stream.isEof()) {
        const ch = stream.next();
        result += ch;

        if (!isEscape && ch == stringChar) {
            return result;
        } else if (ch == ESCAPE_SYMBOL && !isEscape) {
            isEscape = true;
        } else {
            isEscape = false;
        }
    }

    throw new LexerError('string is not closed, line: ' + pos.line, stream);
}

export function simpleRoundBracketsReader(stream : InputStream) : ReaderResult {
    if (stream.peek() == '(') {
        let result = '';
        let level = 0;
        const pos = stream.position();
        while (!stream.isEof()) {
            var ch = stream.next();
            if (ch == '(') {
                level++;
            } else if (ch == ')') {
                level--;
            }
            result += ch;
            if (level == 0) {
                return {
                    type: TokenType.RoundBrackets,
                    position: pos,
                    value: result
                } as Token;
            }
        }
        throw new LexerError('brackets do not match', stream);
    }

    return null;
}

export function makeBracketsReader(startBracket: '(' | '[', endBracket: ')' | ']'): Reader {
    return function bracketsReaderInst(stream : InputStream) : ReaderResult {
        if (stream.peek() == startBracket) {
            let result = '';
            let level = 0;
            const pos = stream.position();
            while (!stream.isEof()) {
                var ch = stream.next();
                if (ch == '/' && level > 0) {
                    ch = ch + readSkippingComment(stream);
                } else if (ch == '\'' || ch == '"' || ch == '`') {
                    ch = readSkippingStrings(ch, stream);
                } else if (ch == '\\') {
                    if (stream.isEof()) {
                        throw new LexerError(`unexpected end. ${endBracket} is expected`, stream);
                    }
                    ch += stream.next();
                } else if (ch == startBracket) {
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
