import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { translator } from "./translator";

const CSS = `@import 'main.css';

const bgColor = '#fff';

.className {
  color: red;
  background: $\{bgColor\};
}`;

function evalCode(css : string) {
    const result = translator(parseJssScript(ArrayTokenStream.fromString(css)));
    const evalCode = result.replace('export styles;', 'styles;');

    try {
        return expect(eval(evalCode));
    } catch(e) {
        console.error(e, result);
        throw e;
    }
}


describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)));
        expect(result).toEqual(`// this code is autogenerated, do not edit it
var styles = [];
styles.push("@import 'main.css';");

const bgColor = '#fff';
(function(styles) {
var _subBlocks = [];
var name = \`.className\`;
var value = {};
value["color"] = \`red\`;
value["background"] = \`$\{bgColor\}\`;

styles.push({name: name, value: value});
for(var item of _subBlocks) {
styles.push(item);
}
})(styles);

export styles;`);

      const evalCode = result.replace('export styles;', 'styles;');

      expect(eval(evalCode)).toEqual([
        "@import 'main.css';",
        {name: '.className', value: { color: 'red', background: '#fff' }}
      ]);
    });

    it('parses nested classes', () => {
        evalCode(`.className1 .className2 {
  font-size: 10px;

  .className3 {
    font-size: 12px;
}
}`).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className3', value: { "font-size": "12px" }},
]);
    });

    it('parses vars in selectors', () => {
        evalCode(`const className = '.someClassName';
$\{className\} .className2 {
  font-size: 10px; }`).toEqual([
    {name: '.someClassName .className2', value: { "font-size": "10px" }},
])
    });

    it('can access parents objects by this keyword', () => {
        evalCode(`.className1 .className2 {
  font-size: 10px;

  $\{this.name\}.className3 {
    font-size: 12px;
}
}`).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className1 .className2.className3', value: { "font-size": "12px" }},
]);
    });


});
