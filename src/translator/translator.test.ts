import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { translator } from "./translator";

const CSS = `@import 'main.css';

const bgColor = '#fff';

.className {
  color: red;
  background: $\{bgColor\};
}`;

describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)));
        expect(result).toEqual(`var css = [];
css.push("@import 'main.css';");

const bgColor = '#fff';
(function(css) {
var _subBlocks = [];
var name = \`.className\`;
var value = {};
value["color"] = \`red\`;
value["background"] = \`$\{bgColor\}\`;

css.push({name: name, value: value});
for(var item of _subBlocks) {
css.push(item);
}
})(css);

export default css;`);

      const evalCode = result.replace('export default ', '');

      expect(eval(evalCode)).toEqual([
        "@import 'main.css';",
        {name: '.className', value: { color: 'red', background: '#fff' }}
      ])
    });


});
