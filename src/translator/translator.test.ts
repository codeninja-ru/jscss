import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { translator } from "./translator";
// @ts-ignore
import vm from "vm";
import { JssBlock, JssBlockCaller, JssStyleBlock, JssStyleSheet } from "./lib/core";

const CSS = `@import 'main.css';

const bgColor = '#fff';

.className {
  color: red;
  background: $\{bgColor\};
}`;

function evalCode(css : string) {
    const sourceCode = translator(parseJssScript(ArrayTokenStream.fromString(css)));
    const context = {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
    };
    try {
        const script = new vm.Script(sourceCode.value.replace('export _styles', '_styles'));
        vm.createContext(context);
        return script.runInContext(context);
    } catch(e) {
        console.log(sourceCode);
        console.error(e);
        throw e;
    }
}


describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)));
        expect(result).toEqual(`// this code is autogenerated, do not edit it
var _styles = _styles ? _styles : new JssStylesheet();
var self = null;
_styles.insertCss("@import 'main.css';");

const bgColor = '#fff';
_styles.insertBlock((function() {
var self = new JssStyleBlock(\`.className\`);
self.push(\`color\`, \`red\`);
self.push(\`background\`, \`$\{bgColor\}\`);

return self;
}).bind(self)());

export _styles;`);

        expect(evalCode(CSS).toCss()).toEqual(`@import 'main.css';

.className {
    color: red;
    background: #fff;
}`);
    });

    it('parses nested classes', () => {
        expect(evalCode(`.className1 .className2 {
  font-size: 10px;

  .className3 {
    font-size: 12px;
}
}`).toArray()).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className3', value: { "font-size": "12px" }},
]);
    });

    it('parses vars in selectors', () => {
        expect(evalCode(`const className = '.someClassName';
$\{className\} .className2 {
font-size: 10px; }`).toArray()).toEqual([
    {name: '.someClassName .className2', value: { "font-size": "10px" }},
])
    });

    it('can access parents objects by this keyword', () => {
        expect(evalCode(`.className1 .className2 {
  font-size: 10px;

  $\{this.name\}.className3 {
    font-size: $\{this.styles.fontSize\};
}
}`).toArray()).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className1 .className2.className3', value: { "font-size": "10px" }},
]);
    });

    it('can call functions', () => {
        expect(evalCode(`
function pad2(n) { return n.length > 1 ? n : "0" + n; }
function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(b.toString(16)); }
.className {
  color: $\{rgb(255,255,255)\};
}
`).toArray()).toEqual([
    {name: '.className', value: { color:  "#ffffff"}}
])
    });

    it('can extend class by ... (3 dots) operator', () => {
        expect(evalCode(`const mixin = { "color": "red" };
.childClass {
  font-size: 10px;
  ...mixin;
}`).toArray()).toEqual([
    {name: ".childClass", value: {color: "red", "font-size": "10px"}}
]);
    });

    it('can handle ...this.style', () => {
        expect(evalCode(`.parent {
    font-size: 10px;
    color: red;
    .child {
        ...this.styles;
    }
}`).toArray()).toEqual([
    {name: ".parent", value: {color: "red", "font-size": "10px"}},
    {name: ".child", value: {color: "red", "font-size": "10px"}}
]);
    });

    it('can handle jss varables', () => {
        expect(evalCode(`const hidden = { display: none; };
.className {
    font-size: 10px;
    ...hidden;
}
`).toArray()).toEqual([
    {name: ".className", value: {display: "none", "font-size": "10px"}},
]);
    });

    it('can handle jss variables with child nodes, and ${this} is refered to the parent class', () => {
        expect(evalCode(`const clearfix = {
    display: block;
    $\{this.name\}:after {
        content: ".";
        display: table;
        clear: both;
    }
};
.className {
    font-size: 10px;
    ...clearfix;
}
.className2 {
    font-size: 11px;
    ...clearfix;
}
`).toArray()).toEqual([
    {name: ".className", value: {"font-size": "10px", "display": "block"}},
    {name: ".className:after", value: {content: '"."', display: "table", clear: "both"}},
    {name: ".className2", value: {"font-size": "11px", "display": "block"}},
    {name: ".className2:after", value: {content: '"."', display: "table", clear: "both"}},
]);
    });



});
