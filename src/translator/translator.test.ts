import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { translator } from "./translator";

const CSS = `@import 'main.css';

const bgColor = '#fff';

.className {
  color: red;
  background: $\{bgColor\};
}`;

function example(css) {
    this.name = ".className";
    this.value = {
        color: "red",
        background: `${bgColor}`
    }
}

describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)));
        expect(result).toEqual(`var css = [];
css.push("@import 'main.css';");
const bgColor = '#fff';
css.push({
  ".className": {
    "color": "red";
    background: \`$\{bgColor\}\`;
  }
});

export default css;
`);
    });

    it('trans', () => {

    });


});
