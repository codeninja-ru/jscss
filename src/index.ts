import { parseStream } from 'parser/lexer';
import { StringInputStream } from './stream/input';

console.log(parseStream(new StringInputStream(`
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
