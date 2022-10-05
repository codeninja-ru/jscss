import { InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
import { Position } from "stream/position";
import { Token, TokenType } from "token";
import { Reader, readSymbol } from "./readers";

const ESCAPE_SYMBOL = '\\';

export function makeCommentAndRegexpReader(stream: InputStream): Reader {
    function parseRegexp(start : string, pos: Position) {
        let result = '/' + start;
        let isEscapeMode = false;
        while (!stream.isEof()) {
            var ch = stream.next();
            if (ch == '\n') {
                break;
            }
            result += ch;
            if (!isEscapeMode && ch == '/') {
                if (result.length > 2) { // regexp can't be empty (//)
                    return {
                        type: TokenType.SlashBrackets,
                        position: pos,
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

    return function() {
        if (stream.peek() == '/') {
            const pos = stream.position();
            stream.next();

            if (stream.isEof()) {
                throw stream.formatError('unexpected end of the comment block');
            }

            var ch = stream.next();

            if (ch == '/') {
                // comment
                return {
                    type: TokenType.Comment,
                    position: pos,
                    value: '/' + ch + readToEnd(new TillEndOfLineStream(stream))
                } as Token;
            } else if (ch == '*') {
                var comment = stream.readUntil('*/')
                return {
                    type: TokenType.MultilineComment,
                    position: pos,
                    value: '/' + ch + comment
                } as Token;
            } else {
                return parseRegexp(ch, pos);
            }
        }
        return null;
    };
}

function expectNextSymbol(stream : InputStream, ch : string) {
    if (stream.peek() == ch) {
        if (stream.isEof()) {
            throw stream.formatError('unexpected end of the comment block');
        }
        stream.next();

    } else {
        throw stream.formatError(`unexpected symbol "${stream.peek()}", did you mean "<!--" ?, JSX is not supported`);
    }
}

export function makeCssCommentReader(stream: InputStream): Reader {
    return function() {
        if (stream.peek() == '<') {
            const pos = stream.position();
            stream.next();
            if (stream.peek() != '!') {
                const [value,] = readSymbol(stream);
                return {
                    type: TokenType.Symbol,
                    position: pos,
                    value: '<' + value,
                }
            }

            expectNextSymbol(stream, '!');
            expectNextSymbol(stream, '-');
            expectNextSymbol(stream, '-');

            var comment = stream.readUntil('-->');
            return {
                type: TokenType.CssComment,
                position: pos,
                value: '<!--' + comment,
            } as Token;
        }

        return null;
    };
}
