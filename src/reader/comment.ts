import { InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
import { Token, TokenType } from "token";
import { makeRegExpReader, Reader, readSymbol } from "./readers";

export function makeCommentAndRegexpReader(stream: InputStream): Reader {
    const regexpReader = makeRegExpReader(stream);
    return function() {
        if (stream.peek() == '/') {
            stream.next();

            if (stream.isEof()) {
                throw stream.formatError('unexpected end of the comment block');
            }

            var ch = stream.next();

            if (ch == '/') {
                // comment
                return {
                    type: TokenType.Comment,
                    position: stream.position(),
                    value: '/' + ch + readToEnd(new TillEndOfLineStream(stream))
                } as Token;
            } else if (ch == '*') {
                var comment = stream.readUntil('*/')
                return {
                    type: TokenType.MultilineComment,
                    position: stream.position(),
                    value: '/' + ch + comment
                } as Token;
            } else {
                return regexpReader();
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
            stream.next();
            if (stream.peek() != '!') {
                return {
                    type: TokenType.Symbol,
                    position: stream.position(),
                    value: '<' + readSymbol(stream),
                }
            }

            expectNextSymbol(stream, '!');
            expectNextSymbol(stream, '-');
            expectNextSymbol(stream, '-');

            var comment = stream.readUntil('-->');
            return {
                type: TokenType.CssComment,
                position: stream.position(),
                value: '<!--' + comment,
            } as Token;
        }

        return null;
    };
}
