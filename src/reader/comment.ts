import { InputStream, TillEndOfLineStream, readToEnd, MultilineCommentStream, StringInputStream, SearchableInputStream } from "stream/input";
import { Token } from "token";
import { Reader } from "./readers";

export function makeCommentReader(stream: InputStream) : Reader {
    return function() {
        if (stream.peek() == '/') {
            stream.next();
            var ch = stream.next();

            if (ch == '/') {
                // comment
                return {
                    type: 'comment',
                    value: ch + readToEnd(new TillEndOfLineStream(stream))
                } as Token;
            } else if (ch == '*') {
                var comment = stream.readUntil('*/')
                if (comment == null) {
                    throw stream.formatError('unexpected end of the comment');
                }
                return {
                    type: 'multiline_comment',
                    value: ch + comment
                } as Token;
            } else {
                throw stream.formatError('unexpected symbol, "/" or "*" is expected');
            }
        }
        return null;
    };
}