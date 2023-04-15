import { LexerError } from "parser/parserError";
import { InputStream, readToEnd, TillEndOfLineStream } from "stream/input";
import { Token, TokenType } from "token";
import { ReaderResult } from "./readers";

export function commentReader(stream : InputStream) : ReaderResult {
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
            var comment = stream.readUntil('*/');
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
}
