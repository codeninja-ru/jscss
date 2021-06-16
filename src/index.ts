import { InputStream } from './stream/InputStream';
import { StringInputStream } from './stream/StringInputStream';

function readStream(stream: InputStream) {
    while (!stream.isEof()) {
        var ch = stream.next();
        if (ch == 'i') {

        } else if (ch == '{') {

        } else if (ch == '}') {
        } else {
            throw stream.formatError('unexpected symbol ' + ch);
        }
    }
}

console.log(readStream(new StringInputStream(`
import { func, classNameBase } from 'foo';

var test1 = '123';
let test2 = '2';
const classNameBase = {
  display: block;
};

function color(color) {
  return color;
}

.className {
  ...classNameBase;
  [generateProp]: bold;
  font-weight: test ? 'bold' : 'normal';
  font-seze: 12px;
  color: color(#eee);
  background: func();
}
`)));
