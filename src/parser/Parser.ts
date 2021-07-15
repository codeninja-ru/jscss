import { BlockInputStream, InputStream, LiteralInputStream } from 'stream/input';
import { StringOutputStream } from 'stream/output';
import { CommentToken, LazyBlockToken, LiteralToken, SpaceToken, Token } from 'token/Token';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream } from 'stream/input';

export function parseStram(stream: InputStream) {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    try {
        while (!stream.isEof()) {
            var ch = stream.peek();
            if (KindOfSpaceInputStream.isKindOfSpace(ch)) {
                tokens.push({
                    type: 'space',
                    value: readToEnd(new KindOfSpaceInputStream(stream))
                } as SpaceToken);
            } else if (ch == '/') {
                stream.next();
                ch = stream.next();
                if (ch == '/') {
                    // comment
                    tokens.push({
                        type: 'comment',
                        value: readToEnd(new TillEndOfLineStream(stream))
                    } as CommentToken);
                } else if (ch == '*') {
                    //todo multiline comment
                    throw new Error('not implememnted');
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

            } else if (BlockInputStream.isBlockStart(ch)) {
                tokens.push({
                    type: 'lazy_block',
                    value: readToEnd(new BlockInputStream(stream)),
                } as LazyBlockToken);
            } else if (LiteralInputStream.isLiteral(ch)) {
                tokens.push({
                    type: 'literal',
                    value: readToEnd(new LiteralInputStream(stream))
                } as LiteralToken);
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
