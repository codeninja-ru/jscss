import { InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
import { Token, TokenType } from "token";
import { makeRegExpReader, Reader } from "./readers";

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
                    value: '/' + ch + readToEnd(new TillEndOfLineStream(stream))
                } as Token;
            } else if (ch == '*') {
                var comment = stream.readUntil('*/')
                if (comment == null) {
                    throw stream.formatError('unexpected end of the comment');
                }
                return {
                    type: TokenType.MultilineComment,
                    value: '/' + ch + comment
                } as Token;
            } else {
                return regexpReader();
            }
        }
        return null;
    };
}
