import { makeCommentAndRegexpReader } from 'reader/comment';
import { makeBlockReader, makeBracketsReader, makeCommaReader, makeLiteralReader, makeRegExpReader, makeSemicolonRader, makeSpaceReader, makeStringReader, makeSymboleReader, makeTemplateStringReader, makeUnexpectedSymbolReader, Reader } from 'reader/readers';
import { InputStream } from 'stream/input';
import { StringOutputStream } from 'stream/output';
import { Token } from 'token/Token';

export function lexer(stream: InputStream) {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    const readers: Array<Reader> = [
        makeSpaceReader(stream),
        makeCommaReader(stream),
        makeSemicolonRader(stream),
        makeSymboleReader(stream),
        makeLiteralReader(stream),
        makeBlockReader(stream),
        makeCommentAndRegexpReader(stream),
        makeStringReader(stream, "'"),
        makeStringReader(stream, '"'),
        makeTemplateStringReader(stream),
        makeSymboleReader(stream),
        makeBracketsReader(stream, '(', ')'),
        makeBracketsReader(stream, '[', ']'),
        makeRegExpReader(stream),

        // keep it always in the end
        makeUnexpectedSymbolReader(stream),
    ];

    try {
        while (!stream.isEof()) {
            for (var reader of readers) {
                var token = reader();
                if (token) {
                    tokens.push(token);
                    break;
                }
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