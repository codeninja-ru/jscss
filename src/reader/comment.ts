import { LexerError } from "parser/parserError";
import { InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
import { Token, TokenType } from "token";
import { Reader, readSymbol } from "./readers";

export function makeCommentReader(stream: InputStream): Reader {
    return function() {
        if (stream.peek() == '/') {
            const pos = stream.position();
            stream.next();

            if (stream.isEof()) {
                throw new LexerError('unexpected end', stream);
            }

            var ch = stream.peek();

            if (ch == '/') {
                stream.next();
                // comment
                return {
                    type: TokenType.Comment,
                    position: pos,
                    value: '/' + ch + readToEnd(new TillEndOfLineStream(stream))
                } as Token;
            } else if (ch == '*') {
                stream.next();
                var comment = stream.readUntil('*/')
                return {
                    type: TokenType.MultilineComment,
                    position: pos,
                    value: '/' + ch + comment
                } as Token;
            } else {
                return {
                    type: TokenType.Symbol,
                    position: pos,
                    value: '/',
                };
            }
        }
        return null;
    };
}

function expectNextSymbol(stream : InputStream, ch : string) {
    if (stream.peek() == ch) {
        if (stream.isEof()) {
            throw new LexerError('unexpected end of the comment block', stream);
        }
        stream.next();

    } else {
        throw new LexerError(`unexpected symbol "${stream.peek()}", did you mean "<!--" ?, JSX is not supported`, stream);
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
