import { InputStream, LiteralInputStream } from 'stream/input';
import { StringOutputStream } from 'stream/output';
import { Token } from 'token/Token';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream } from 'stream/input';

export function parseStram(stream: InputStream) {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    while (!stream.isEof()) {
        var ch = stream.peek();
        if (KindOfSpaceInputStream.isKindOfSpace(ch)) {
            tokens.push({
                type: 'space',
                value: readToEnd(new KindOfSpaceInputStream(stream))
            } as Token);
        } else if (ch == '/') {
            if (stream.next() == '/') {
                // comment
                tokens.push({
                    type: 'comment',
                    value: readToEnd(new TillEndOfLineStream(stream))
                } as Token);
            } else {
                throw stream.formatError('unexpected symbol, "/" is expected');
            }
        } else if (ch == "'") {
        } else if (ch == "=") {
        } else if (ch == ";") {
        } else if (ch == "@") {
        } else if (ch == "\"") {
        } else if (ch == "[") {
        } else if (ch == "(") {

        } else if (ch == '{') {

        } else if (LiteralInputStream.isLiteral(ch)) {
            tokens.push({
                type: 'literal',
                value: readToEnd(new LiteralInputStream(stream))
            } as Token);
        } else {
            throw stream.formatError('unexpected symbol ' + ch);
        }
        stream.next();
    }
    out.close();
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
