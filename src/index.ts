import { InputStream, StringInputStream } from './stream/input';
import { StringOutputStream } from './stream/output';
import { Token } from './token/Token';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream } from './stream/input';

function readLine(input: InputStream): string {
    var result = '';
    while (!input.isEof()) {
        var ch = input.next();
        result += ch;
        if (ch == "\n") {
            break;
        }
    }

    return result;
}

type Char = string;

function readWhile(input: InputStream, fn: (ch: Char) => boolean): string {
    var result = "";

    while (!input.isEof() && !fn(input.peek())) {
        result += input.next();
    }

    return result;
}


function readStream(stream: InputStream) {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    while (!stream.isEof()) {
        var ch = stream.next();
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

        } else if (ch == '{') {

        } else {
            throw stream.formatError('unexpected symbol ' + ch);
        }
    }
    out.close();
}
console.log(readStream(new StringInputStream(`
// comment

.className {
  ...classNameBase;
  [generateProp]: bold;
  font-weight: test ? 'bold' : 'normal';
  font-size: 12px;
  color: color(#eee);
  background: func();
}
`)));

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
