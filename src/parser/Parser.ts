import { BlockInputStream, InputStream, LiteralInputStream, MultilineCommentStream } from 'stream/input';
import { StringOutputStream } from 'stream/output';
import { CommaToken, CommentToken, LazyBlockToken, LiteralToken, MultilineCommentToken, SpaceToken, Token } from 'token/Token';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream } from 'stream/input';
import { makeBlockReader, makeCommaReader, makeUnexpectedSymbolReader, makeLiteralReader, makeSpaceReader, Reader, makeStringReader } from 'reader/readers';
import { makeCommentReader } from 'reader/comment';

export function parseStream(stream: InputStream) {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    const readers : Array<Reader> = [
        makeSpaceReader(stream),
        makeCommaReader(stream),
        makeLiteralReader(stream),
        makeBlockReader(stream),
        makeCommentReader(stream),
        makeStringReader(stream, "'"),
        makeStringReader(stream, '"'),

        // keep it always in the end
        makeUnexpectedSymbolReader(stream),
    ];

    try {
        while (!stream.isEof()) {
            var ch = stream.peek();
            for (var reader of readers) {
                var token = reader();
                if (token) {
                    tokens.push(token);
                    break;
                }
            }
            if (ch == "'") {
            } else if (ch == "\"") {
            } else if (ch == "=") {
            } else if (ch == ";") {
            } else if (ch == "@") {
            } else if (ch == "\"") {
            } else if (ch == "[") {
            } else if (ch == "(") {
            } else {
                throw stream.formatError(`unexpected symbol '${ch}' code: ${ch.charCodeAt(0)}`);
            }
        }
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        out.close();
    }

    return tokens;
}
//console.log(readStream(new StringInputStream(`
//import { func, classNameBase } from 'foo';
//
//var test1 = '123';
//let test2 = '2';
//const classNameBase = {
//  display: block;
//};
//
//function color(color) {
//  return color;
//}
//
//// comment
//
//.className {
//  ...classNameBase;
//  [generateProp]: bold;
//  font-weight: test ? 'bold' : 'normal';
//  font-seze: 12px;
//  color: color(#eee);
//  background: func();
//}
//`)));
