import { parseJssScript } from "./jssParser";
import { NodeType } from "./syntaxTree";
import { ArrayTokenStream, GoAheadTokenStream } from "./tokenStream";

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
        const stream = new GoAheadTokenStream(ArrayTokenStream.fromString(SIMPLE));
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
                    items: [".className", " >", " a:hover"],
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
                        items: [".subClass", " +", " a:hover"],
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
                    items: ["${name}", " .className"],
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
        parseCode(`const hidden = { display: none; }`).toEqual([
            {type: NodeType.JssVarDeclaration, keyword: 'const', keywordPos: {line: 1, col: 1},
             name: 'hidden', namePos: {line: 1, col: 7},
             hasExport: false, items: expectedItems(18, 27)}
        ]);
        parseCode(`let hidden = { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'let',
                                                               hasExport: false, items: expectedItems(16, 25),
                                                               keywordPos: {line: 1, col: 1}, namePos: {line: 1, col:5}}]);
        parseCode(`var hidden = { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'var',
                                                               hasExport: false, items: expectedItems(16, 25),
                                                               keywordPos: {line: 1, col: 1}, namePos: {line: 1, col:5}}]);
        parseCode(`export let hidden = { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'let',
                                                               hasExport: true, items: expectedItems(16 + 7, 25 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:12}, exportPos: {line: 1, col:1}}]);
        parseCode(`export var hidden = { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'var',
                                                               hasExport: true, items: expectedItems(23, 25 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:12}, exportPos: {line: 1, col:1}}]);
        parseCode(`export const hidden = { display: none; }`).toEqual([{type: NodeType.JssVarDeclaration, name: 'hidden', keyword: 'const',
                                                               hasExport: true, items: expectedItems(25, 27 + 7),
                                                               keywordPos: {line: 1, col: 8}, namePos: {line: 1, col:14}, exportPos: {line: 1, col:1}}]);
    });
});
