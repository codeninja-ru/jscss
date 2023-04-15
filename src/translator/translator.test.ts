import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { evalTestCode } from "testUtils";
import { translator } from "./translator";

const CSS = `@import 'main.css';

const bgColor = '#fff';

.className {
  color: red;
  background: $\{bgColor\};
}`;

describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)),
                                 'result.jss',
                                 'result.css');
        const codeWithoutSourceMap = result.value.replace(/\/\/# sourceMappingURL.*/, '').trim();
        expect(codeWithoutSourceMap).toEqual(`// this code is autogenerated, do not edit it
var _styles = _styles ? _styles : new JssStylesheet();
var self = null;

_styles.insertCss(\`@import 'main.css';\`);
const bgColor = '#fff';
_styles.insertBlock((function(parent) {
var self = new JssStyleBlock([\`.className\`], {}, parent);

(function(){
self.push(\`color\`, \`red\`);
self.push(\`background\`, \`$\{bgColor\}\`);

}).bind(self)();
return self;
}).bind(self)(self));

export _styles;`);
        expect(result.value).toMatch(/\/\/# sourceMappingURL=data:application\/json;charset=utf\-8;base64,[\w\+]+=*$/);

        expect(evalTestCode(CSS).toCss()).toEqual(`@import 'main.css';

.className {
    color: red;
    background: #fff;
}`);
    });

    it('parses nested classes', () => {
        expect(evalTestCode(`.className1 .className2 {
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
        expect(evalTestCode(`const className = '.someClassName';
$\{className\} .className2 {
font-size: 10px; }`).toArray()).toEqual([
    {name: '.someClassName .className2', value: { "font-size": "10px" }},
])
    });

    it('parses vars in propertyName in ${}', () => {
        expect(evalTestCode(`const propName = 'color';
div a:hover {
background-$\{propName\}: #444;
$\{propName\}: #fff;
}`).toArray()).toEqual([
    {name: 'div a:hover', value: { "color": "#fff", "background-color": '#444' }},
])
    });

    it('parses vars in propertyName in []', () => {
        expect(evalTestCode(`const propName = 'color';
div a:hover {
[propName]: #fff;
}`).toArray()).toEqual([
    {name: 'div a:hover', value: { "color": "#fff" }},
])
    });

    it('can access parents objects by this keyword', () => {
        expect(evalTestCode(`.className1 .className2 {
  font-size: 10px;

  $\{this.name\}.className3 {
    font-size: $\{this.parent.styles.fontSize\};
}
}`).toArray()).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className1 .className2.className3', value: { "font-size": "10px" }},
]);
    });

    it('can access parents objects by parent keyword', () => {
        expect(evalTestCode(`.className1 .className2 {
  font-size: 10px;

  $\{this.name\}.className3 {
    font-size: $\{parent.styles.fontSize\};
}
}`).toArray()).toEqual([
    {name: '.className1 .className2', value: { "font-size": "10px" }},
    {name: '.className1 .className2.className3', value: { "font-size": "10px" }},
]);
    });

    it('can call functions', () => {
        expect(evalTestCode(`
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
        expect(evalTestCode(`const mixin = new { color: red };
.childClass {
  font-size: 10px;
  ...mixin;
}`).toArray()).toEqual([
    {name: ".childClass", value: {color: "red", "font-size": "10px"}}
]);

        expect(evalTestCode(`const mixin = new { "color": red };
.childClass {
  font-size: 10px;
  ...mixin;
}`).toArray()).toEqual([
    {name: ".childClass", value: {color: "red", "font-size": "10px"}}
]);
    });

    it('can handle ...this.style', () => {
        expect(evalTestCode(`.parent {
    font-size: 10px;
    color: red;
    .child {
        ...this.parent.styles;
    }
}`).toArray()).toEqual([
    {name: ".parent", value: {color: "red", "font-size": "10px"}},
    {name: ".child", value: {color: "red", "font-size": "10px"}}
]);
    });

    it('can handle jss varables', () => {
        expect(evalTestCode(`const hidden = new { display: none; };
.className {
    font-size: 10px;
    ...hidden;
}
`).toArray()).toEqual([
    {name: ".className", value: {display: "none", "font-size": "10px"}},
]);
    });

    it('can handle jss variables with child nodes, and ${this} is refered to the parent class', () => {
        expect(evalTestCode(`const clearfix = new {
    display: block;
    name: $\{this.name\};
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
    {name: ".className", value: {"font-size": "10px", "display": "block", "name": ".className"}},
    {name: ".className:after", value: {content: '"."', display: "table", clear: "both"}},
    {name: ".className2", value: {"font-size": "11px", "display": "block", "name": ".className2"}},
    {name: ".className2:after", value: {content: '"."', display: "table", clear: "both"}},
]);
    });

    it('parses some complecated syntax', () => {
        expect(evalTestCode(`const a = 1; const b = 2; const c = a+b; _styles = c;`)).toEqual(3);
        expect(evalTestCode(`const a = 1; const b = 2; const c = b-a; _styles = c;`)).toEqual(1);

        expect(evalTestCode(`html { -webkit-text-size-adjust: 100%; /* 2 */ }`).toArray()).toEqual([
            {name: "html", value: {"-webkit-text-size-adjust": "100%"}},
        ]);

        expect(evalTestCode(`button::-moz-focus-inner,[type="button"]::-moz-focus-inner{padding: 0;}`).toArray()).toEqual([
            {name: `button::-moz-focus-inner, [type="button"]::-moz-focus-inner`, value: {
                padding: "0",
            }}
        ]);

    });

    it('parses media queries', () => {
        expect(evalTestCode(`@media only screen and (max-width: 600px) {
  body {
    background-color: lightblue;
  }
}`).toArray()).toEqual([{name: '@media only screen and (max-width: 600px)', children: [
    {name: 'body', value: {"background-color": 'lightblue'}}
]}]);
    });

    it('parses complex media queries', () => {
        //TODO instead of @media there can be @page, @charset and etc
        expect(evalTestCode(`.className {
    width: 100px;
    const value = '#fff';
    @media screen {
        width: 200px;
            @media print {
                width: \${Dimentions.fromString(this.parent.styles.width).add(100)};
                color: \${value};
        } } }`).toArray()).toEqual([
            {name: '.className', value: {width: '100px'}},
            {name: '@media screen', children: [
                {name: '.className', value: {width: '200px'}},
                {name: '@media print', children: [
                    {name: '.className', value: {
                        width: '300px',
                        color: '#fff',
                    }},
                ]}
            ]}
        ]);
    });

    it('can parse variables inside style blocks', () => {
        expect(evalTestCode(`.className { const value = 10; width: \${10 + value}px; }`).toCss())
            .toEqual(`.className {
    width: 20px;
}`);
    });

    it('can parse functions inside style blocks', () => {
        expect(evalTestCode(`.className { function randomNumber() { return 42; } width: \${randomNumber()}px; }`).toCss())
            .toEqual(`.className {
    width: 42px;
}`);
    });

    it('can parse jss variables inside style blocks', () => {
        expect(evalTestCode(`.className { const value = new { display: block }; ...value; }`).toCss())
            .toEqual(`.className {
    display: block;
}`);
    });

    it('translates @font-face', () => {
        const source = `@font-face {
    font-family: "Bitstream Vera Serif Bold";
    src: url("https://mdn.github.io/css-examples/web-fonts/VeraSeBd.ttf");
}

body {
    font-family: "Bitstream Vera Serif Bold", serif;
}`;
        expect(evalTestCode(source).toCss()).toEqual(source);
    });

    it('cannot declare @font-face within selectors', () => {
        expect(() => evalTestCode(`.className { @font-face { font-family: 'test'; } }`).toCss())
            .toThrowError();
    });

    it('support @namespace', () => {
        expect(evalTestCode(`@namespace url(http://www.w3.org/1999/xhtml);
@namespace svg url(http://www.w3.org/2000/svg);`).toCss())
            .toEqual(`@namespace url(http://www.w3.org/1999/xhtml);

@namespace svg url(http://www.w3.org/2000/svg);`);
    });

    it('supprts @keyframes', () => {
        expect(evalTestCode(`const size = '50px';
@keyframes important1 {
  from {
    margin-top: $\{size\};
  }
  50% {
    margin-top: 150px !important;
  } /* ignored */
  to {
    margin-top: 100px;
  }
}

@keyframes important2 {
  from {
    margin-top: 50px;
    margin-bottom: 100px;
  }
  to {
    margin-top: 150px !important; /* ignored */
    margin-bottom: 50px;
  }
}`).toCss()).toEqual(`@keyframes important1 {
  from {
    margin-top: 50px;
  }
  50% {
    margin-top: 150px !important;
  } /* ignored */
  to {
    margin-top: 100px;
  }
}

@keyframes important2 {
  from {
    margin-top: 50px;
    margin-bottom: 100px;
  }
  to {
    margin-top: 150px !important; /* ignored */
    margin-bottom: 50px;
  }
}`);
    });

    it('parses @supports', () => {
        expect(evalTestCode(`@supports (display: flex) {
    .flex-container {
        display: flex;
    }
}`).toCss()).toEqual(`@supports (display: flex) {
    .flex-container {
        display: flex;
    }
}`);

        expect(evalTestCode(`.flex-container {
    @supports (display: flex) {
        display: flex;
    }
}`).toCss()).toEqual(`.flex-container { }

@supports (display: flex) {
    .flex-container {
        display: flex;
    }
}`);
    });

    it('parses any atRules', () => {
        expect(evalTestCode(`@custom-rule (display: flex) {
    .flex-container {
        display: flex;
    }
}`).toCss()).toEqual(`@custom-rule (display: flex) {
    .flex-container {
        display: flex;
    }
}`);
    });

    it('parses any atRules inside blocks', () => {
        expect(evalTestCode(`.flex-container {
    @custom-rule (display: flex) {
        display: flex;
    }
}`).toCss()).toEqual(`.flex-container { }

@custom-rule (display: flex) {
    .flex-container {
        display: flex;
    }
}`);
    });

    it('supports nested @atRules', () => {
        expect(evalTestCode(`@supports (display: flex) {
  @media screen and (min-width: 900px) {
    article {
      display: flex;
    }
  }
}`).toCss()).toEqual(`@supports (display: flex) {
    @media screen and (min-width: 900px) {
        article {
            display: flex;
        }
    }
}`);
    });

    it('parses simple selectors', () => {
        expect(evalTestCode('div { display: block; }').toArray()).toEqual([
            {name: 'div', value: { display: 'block' }}
        ]);
    });


});

describe('confict solving', () => {
    it('should solve confict between jssDeclaration and rulesetStatement', () => {
        expect(evalTestCode(`p { $\{this.name\}:after; $\{this.name\}:after { display: block; } }`).toCss())
            .toEqual(`p {
    p: after;
}

p:after {
    display: block;
}`);
    });
});

