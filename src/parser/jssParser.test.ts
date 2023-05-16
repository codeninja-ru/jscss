import { TokenType } from "token";
import { jssIdent, parseJssScript } from "./jssParser";
import { NodeType } from "./syntaxTree";
import { ArrayTokenStream, LookAheadTokenStream } from "./tokenStream";

const SIMPLE = `import _ from 'lodash';
@import 'style.css';

const color = '#fff';

.className > a:hover {
    color: \${color};
    font-family: 'Arial', sans-serif;
    // comment
    background: #fff;
    ...extend(color);

    .subClass + a:hover {
        color: red;
    }
}`;

function parseCode(source : string) {
    const node = parseJssScript(ArrayTokenStream.fromString(source));
    return expect(node);
}

describe('parseJssScript()', () => {
    it('simple script', () => {
        const stream = new LookAheadTokenStream(ArrayTokenStream.fromString(SIMPLE));
        const node = parseJssScript(stream);

        expect(stream.sourceFragment().value).toEqual(SIMPLE);
        expect(stream.eof()).toBeTruthy();
        expect(node).toEqual([
            {type: NodeType.Raw, value: "import _ from 'lodash';", position: {line: 1, col: 1}},
            {type: NodeType.Ignore, items: ["\n"]},
            {type: NodeType.CssImport, path: "'style.css'", rawValue: "@import 'style.css';", position: {line: 2, col: 1}},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.Raw, value: "const color = '#fff';", position: {line: 4, col: 1}},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: [".className", ">", "a:hover"],
                    position: {line: 6, col: 1},
                },
            ],
             position: {line: 6, col: 1},
             items: [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration,
                 prop: "color", propPos: {line: 7, col: 5},
                 value: "${color}", valuePos: {line: 7, col: 12}},
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "font-family", value: "'Arial', sans-serif",
                 propPos: {line: 8, col: 5}, valuePos: {line: 8, col: 18}},
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "background", value: "#fff",
                 propPos: {line: 10, col: 5}, valuePos: {line: 10, col: 17}},
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssSpread, value: "extend(color)",
                 valuePos: {line: 11, col: 8}},
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssBlock, selectors: [
                    {
                        type: NodeType.JssSelector,
                        items: [".subClass", "+", "a:hover"],
                        position: {line: 13, col: 5},
                    },
                ], items: [
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "color", value: "red",
                    propPos: {line: 14, col: 9}, valuePos: {line: 14, col: 16}},
                    {type: NodeType.Ignore, items: expect.anything()},
                ],
                 position: {line: 13, col: 5},
                },
                {type: NodeType.Ignore, items: expect.anything()},
                ]
            }
        ]);
    });

    it('parses javascript templates in selectors', () => {
        const source = `$\{name\} .className { color: red; }`;
        const node = parseJssScript(ArrayTokenStream.fromString(source));
        expect(node).toEqual([
            { type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: ["${name}", ".className"],
                    position: {line: 1, col: 1}
                }
            ], items: [
            {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "color", propPos: {line: 1, col: 22},
                 value: "red", valuePos: {line: 1, col: 29}},
            {type: NodeType.Ignore, items: expect.anything()},
            ],
              position: {line: 1, col: 1}
            }
        ]);
    });

    it('parses javascript functions', () => {
        const source = `function pad2(n) { return n.length > 1 ? n : "0" + n; }`;
        const node = parseJssScript(ArrayTokenStream.fromString(source));
        expect(node).toEqual([
            { type: NodeType.Raw, value: 'function pad2(n) { return n.length > 1 ? n : "0" + n; }', position: {line: 1, col: 1} }
        ]);
    });

    it('parses code with functions', () => {
        parseCode(`function pad2(n) { return n.length > 1 ? n : "0" + n; }
function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(g.toString(b)); }
.className {
  color: $\{rgb(255,255,255)\};
}`).toEqual([
    { type: NodeType.Raw, value: 'function pad2(n) { return n.length > 1 ? n : "0" + n; }', position: {line: 1, col: 1} },
    {type: NodeType.Ignore, items: expect.anything()},
    { type: NodeType.Raw, value: 'function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(g.toString(b)); }', position: {line: 2, col: 1} },
    {type: NodeType.Ignore, items: expect.anything()},
    { type: NodeType.JssBlock, selectors: [
        {
            type: NodeType.JssSelector,
            items: [".className"],
            position: {line: 3, col: 1}
        }
    ], items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "color", value: "${rgb(255,255,255)}",
         propPos: {line: 4, col: 3}, valuePos: {line: 4, col: 10}},
        {type: NodeType.Ignore, items: expect.anything()},
    ],
      position: {line: 3, col: 1}
    }
])
    });

    it('parses jss var declarations', () => {
        const expectedItems  = function(propCol : number, valueCol : number) {
            return [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "display", value: "none",
                 valuePos: { col: valueCol, line: 1},  propPos: { col: propCol, line: 1 }},
                {type: NodeType.Ignore, items: expect.anything()},
            ];
        };
        parseCode(`const hidden = new { display: none; }`).toEqual([
            {type: NodeType.JssVarDeclaration, keyword: 'const', keywordPos: {line: 1, col: 1},
             name: 'hidden', namePos: {line: 1, col: 7},
             hasExport: false, items: expectedItems(22, 31)}
        ]);
        parseCode(`let hidden = new { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'let',
                                                               hasExport: false, items: expectedItems(20, 29),
                                                               keywordPos: {line: 1, col: 1}, namePos: {line: 1, col:5}}]);
        parseCode(`var hidden = new { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'var',
                                                               hasExport: false, items: expectedItems(20, 29),
                                                               keywordPos: {line: 1, col: 1}, namePos: {line: 1, col:5}}]);
        parseCode(`export let hidden = new { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'let',
                                                               hasExport: true, items: expectedItems(20 + 7, 29 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:12}, exportPos: {line: 1, col:1}}]);
        parseCode(`export var hidden = new { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'var',
                                                               hasExport: true, items: expectedItems(27, 29 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:12}, exportPos: {line: 1, col:1}}]);
        parseCode(`export const hidden = new { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'const',
                                                               hasExport: true, items: expectedItems(29, 31 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:14}, exportPos: {line: 1, col:1}}]);

        parseCode(`export const hidden = new { display: none }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'const',
                                                               hasExport: true, items: expectedItems(29, 31 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:14}, exportPos: {line: 1, col:1}}]);

        parseCode(`export const hidden = new { "display": none }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'const',
                                                               hasExport: true, items: expectedItems(29, 40),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:14}, exportPos: {line: 1, col:1}}]);
    });

    it('parses without semicolons', () => {
        parseCode(`.className { background: ${'white'} }`).toEqual([
            { type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: [".className"],
                    position: expect.anything(),
                }
            ], items: [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "background", value: "white",
                 propPos: expect.anything(), valuePos: expect.anything()},
                {type: NodeType.Ignore, items: expect.anything()},
            ],
              position: expect.anything(),
            }
        ]);
        parseCode(`.className { background: #fff }`).toEqual([
            { type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: [".className"],
                    position: expect.anything(),
                }
            ], items: [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "background", value: "#fff",
                 propPos: expect.anything(), valuePos: expect.anything()},
                {type: NodeType.Ignore, items: expect.anything()},
            ],
              position: expect.anything(),
            }
        ]);
    });

    it('parses some complecated syntax', () => {
        // some code from normalize.css
        parseCode(`html { -webkit-text-size-adjust: 100%; /* 2 */ }`).toEqual([
            { type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: ["html"],
                    position: expect.anything(),
                }
            ], items: [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.JssDeclaration, prop: "-webkit-text-size-adjust", value: "100%",
                 propPos: expect.anything(), valuePos: expect.anything()},
                {type: NodeType.Ignore, items: expect.anything()},
            ],
              position: expect.anything(),
            }
        ]);
    });

    it('skips #!/bin/sh', () => {
        parseCode(`#!/bin/sh\nalert();`).toEqual([
            {type: NodeType.Raw, position: {col: 1, line: 2}, value: "alert();"},
        ]);
        parseCode(`#!/usr/bin/env node\nalert();`).toEqual([
            {type: NodeType.Raw, position: {col: 1, line: 2}, value: "alert();"},
        ]);
    });

    it('does not allow reserved words in selectors', () => {
        expect(() => parseCode('import { display: none; }'))
            .toThrowError(`(1:1) : "import" is a reserved word, it's not allowed as a selector at index 0`);
    });

    xit('does not allow reserved words in selectors (todo)', () => {
        //TODO we do not parse block of classes yet, so it cannot be tested right now, jss thins is's a valid js class
        expect(() => parseCode('class { display: none; }')).toThrow(`(1:1) : "class" is a reseved word, it's not allowed as a selector`);
        expect(() => parseCode('class TestClass { display: none; }')).toThrow(`(1:1) : "class" is a reseved word, it's not allowed as a selector`);
    });

    it('can parse variables inside style blocks', () => {
        parseCode(`.className { const value = 10; width: 10px; }`).toEqual([
            {type: NodeType.JssBlock, selectors: [{
                type: NodeType.JssSelector,
                items: [".className"],
                position: {line: 1, col: 1},
            }],
             position: {line: 1, col: 1},
             items: [
                 {type: NodeType.Ignore, items: expect.anything()},
                 {type: NodeType.Raw, position: {line: 1, col: 14}, value: "const value = 10;"},
                 {type: NodeType.Ignore, items: expect.anything()},
                 {type: NodeType.JssDeclaration,
                  prop: "width", propPos: {line: 1, col: 32},
                  value: "10px", valuePos: {line: 1, col: 39}},
                 {type: NodeType.Ignore, items: expect.anything()},
             ]},
        ]);
    });

    it('can parse jss variables inside style blocks', () => {
        parseCode(`.className { const value = new { display: block }; ...value; }`).toEqual([
            {type: NodeType.JssBlock, selectors: [{
                type: NodeType.JssSelector,
                items: [".className"],
                position: {line: 1, col: 1},
            }],
             position: {line: 1, col: 1},
             items: [
                 {type: NodeType.Ignore, items: expect.anything()},
                 {type: NodeType.JssVarDeclaration, keyword: 'const', keywordPos: {line: 1, col: 14},
                  name: 'value', namePos: {line: 1, col: 20},
                  hasExport: false, items: [
                      {type: NodeType.Ignore, items: expect.anything()},
                      {type: NodeType.JssDeclaration, prop: "display", value: "block",
                       valuePos: { col: 43, line: 1},  propPos: { col: 34, line: 1 }},
                      {type: NodeType.Ignore, items: expect.anything()},

                  ]},
                 {type: NodeType.Ignore, items: expect.anything()},
                 {type: NodeType.JssSpread, value: "value",
                 valuePos: {line: 1, col: 55}},
                 {type: NodeType.Ignore, items: expect.anything()},
             ]},
        ]);
    });

    it('parses imports', () => {
        parseCode(`import { test } from 'reader/comment';
import * as _ from '/reader/readers';`).toEqual([
    {type: NodeType.Raw, position: {col: 1, line: 1}, value: "import { test } from 'reader/comment';"},
    {type: NodeType.Ignore, items: expect.anything(),},
    {type: NodeType.Raw, position: {col: 1, line: 2}, value: "import * as _ from '/reader/readers';"},
]);
    });

    it('parses media queries', () => {
        parseCode(`@media only screen and (max-width: 600px) {
  body {
    background-color: lightblue;
  }
}`).toEqual([{
    type: NodeType.JssAtRule,
    name: '@media',
    mediaList: ["only screen and (max-width: 600px)"],
    position: {line: 1, col: 1},
    items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssBlock, selectors: [{
                type: NodeType.JssSelector,
                items: ["body"],
                position: {line: 2, col: 3},
         }],
         position: {line: 2, col: 3},
         items: [
             {type: NodeType.Ignore, items: expect.anything()},
             {type: NodeType.JssDeclaration,
              prop: "background-color", propPos: {line: 3, col: 5},
              value: "lightblue", valuePos: {line: 3, col: 23}},
             {type: NodeType.Ignore, items: expect.anything()},
         ]},
        {type: NodeType.Ignore, items: expect.anything()},
    ]}]);
    });

    it('parses @page', () => {
        parseCode(`@page {} @page :left {} @page wide {}`)
            .toEqual([{
                type: NodeType.JssPage,
                pageSelectors: [],
                position: {line: 1, col: 1},
                items: [],
            }, {
                type: NodeType.Ignore,
                items: [" "]
            }, {
                type: NodeType.JssPage,
                pageSelectors: [":left"],
                position: {line: 1, col: 10},
                items: [],
            }, {
                type: NodeType.Ignore,
                items: [" "]
            }, {
                type: NodeType.JssPage,
                pageSelectors: ["wide"],
                position: {line: 1, col: 25},
                items: [],
            }]);
    });

    it('parse jssIdent', () => {
        expect(jssIdent(ArrayTokenStream.fromString('background-${propName}')))
            .toEqual({"position": {"col": 1, "line": 1}, "type": TokenType.HiddenToken, "value": "background-${propName}"});
        expect(jssIdent(ArrayTokenStream.fromString('${propName}')))
            .toEqual({"position": {"col": 1, "line": 1}, "type": TokenType.HiddenToken, "value": "${propName}"});
    });

    it('parses vars in propertyName in ${} and []', () => {
        parseCode(`const propName = 'color';
div a:hover {
background-$\{propName\}: #444;
$\{propName\}: #333;
[propName]: #555;
}`).toEqual([
    { type: NodeType.Raw, value: "const propName = 'color';", position: {line: 1, col: 1} },
    {type: NodeType.Ignore, items: expect.anything()},
    { type: NodeType.JssBlock, selectors: [
        {
            type: NodeType.JssSelector,
            items: ["div", "a:hover"],
            position: expect.anything(),
        }
    ], items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "background-${propName}", value: "#444",
         propPos: expect.anything(), valuePos: expect.anything()},
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "${propName}", value: "#333",
         propPos: expect.anything(), valuePos: expect.anything()},
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "${propName}", value: "#555",
         propPos: expect.anything(), valuePos: expect.anything()},
        {type: NodeType.Ignore, items: expect.anything()},
    ],
      position: expect.anything(),
    }
])
    });

    it('parses $ in names', () => {
        parseCode('const $_ = 1;').toEqual([{
            position: {col: 1, line: 1},
            type: NodeType.Raw,
            value: "const $_ = 1;",
        }]);
    });

    it('root properties', () => {
        parseCode('--width: 10px; --width-a: -12px;').toEqual([
            {type: NodeType.JssDeclaration,
             prop: "--width", propPos: {line: 1, col: 1},
             value: "10px", valuePos: {line: 1, col: 10}},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.JssDeclaration,
             prop: "--width-a", propPos: {line: 1, col: 16},
             value: "-12px", valuePos: {line: 1, col: 27}},
        ]);
    });

    describe('bugs', () => {
        it('parses pseudo classes', () => {
            parseCode(`.markdown-body table tr:nth-child(2n) {
background-color: #f8f8f8;
}`).toEqual([
    { type: NodeType.JssBlock, selectors: [
        {
            type: NodeType.JssSelector,
            items: [".markdown-body", "table", "tr:nth-child(2n)"],
            position: {line: 1, col: 1}
        }
    ], items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "background-color", value: "#f8f8f8",
         propPos: {line: 2, col: 1}, valuePos: {line: 2, col: 19}},
        {type: NodeType.Ignore, items: expect.anything()},
    ],
      position: {line: 1, col: 1}
    }
]);
        });

        it('parses ~ selector', () => {
            parseCode(`.form-checkbox-details-trigger:checked ~ * .form-checkbox-details {
background-color: #f8f8f8;
}`).toEqual([
    { type: NodeType.JssBlock, selectors: [
        {
            type: NodeType.JssSelector,
            items: [".form-checkbox-details-trigger:checked", "~", "*", ".form-checkbox-details"],
            position: {line: 1, col: 1}
        },
    ], items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "background-color", value: "#f8f8f8",
         propPos: {line: 2, col: 1}, valuePos: {line: 2, col: 19}},
        {type: NodeType.Ignore, items: expect.anything()},
    ],
      position: {line: 1, col: 1}
    }
]);
        });

        it('parses [] with pseudo classes', () => {
            parseCode(`[type="number"]:hover{}`)
                .toEqual([
                    {
                        type: NodeType.JssBlock,
                        selectors: [
                            {
                                type: NodeType.JssSelector,
                                items: ["[type=\"number\"]:hover"],
                                position: {line: 1, col: 1},
                            }
                        ],
                        items: [],
                        position: {line: 1, col: 1},
                    }
                ]);
        });
    });

    it('parses css expr', () => {
        parseCode(`.className{padding-right: 8px${'\\'}9;}`)
            .toEqual([
                { type: NodeType.JssBlock, selectors: [
                    {
                        type: NodeType.JssSelector,
                        items: [".className"],
                        position: {line: 1, col: 1}
                    },
                ], items: [
                    {type: NodeType.JssDeclaration, prop: "padding-right", value: '8px\\9',
                     propPos: {line: 1, col: 12}, valuePos: {line: 1, col: 27}},
                ],
                  position: {line: 1, col: 1}
                }
            ]);
    });

    it('parses octal escape sequences', () => {
        parseCode(`.className{content: "${'\\'}00a0";}`).toEqual([
            { type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: [".className"],
                    position: {line: 1, col: 1}
                },
            ], items: [
                {type: NodeType.JssDeclaration, prop: "content", value: '"\\00a0"',
                 propPos: {line: 1, col: 12}, valuePos: {line: 1, col: 21}},
            ],
              position: {line: 1, col: 1}
            }
        ]);
    });

});
