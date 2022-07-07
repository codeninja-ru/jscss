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

        expect(stream.rawValue()).toEqual(SIMPLE);
        expect(stream.eof()).toBeTruthy();
        expect(node).toEqual([
            {type: NodeType.Raw, value: "import _ from 'lodash';"},
            {type: NodeType.Ignore, items: ["\n"]},
            {type: NodeType.CssImport, path: "'style.css'", rawValue: "@import 'style.css';"},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.Raw, value: "const color = '#fff';"},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.JssBlock, selectors: [
                {
                    type: NodeType.JssSelector,
                    items: [".className", " >", " a:hover"]
                },
            ], items: [
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "color", value: "${color}"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "font-family", value: "'Arial', sans-serif"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "background", value: "#fff"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssSpread, value: "extend(color)"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssBlock, selectors: [
                        {
                            type: NodeType.JssSelector,
                            items: [".subClass", " +", " a:hover"]
                        },
                    ], items: [
                        {type: NodeType.Ignore, items: expect.anything()},
                        {type: NodeType.JssDeclaration, prop: "color", value: "red"},
                        {type: NodeType.Ignore, items: expect.anything()},
                    ]},
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
                }
            ], items: [
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.JssDeclaration, prop: "color", value: "red"},
            {type: NodeType.Ignore, items: expect.anything()},
            ]}
        ]);
    });

    it('parses javascript functions', () => {
        const source = `function pad2(n) { return n.length > 1 ? n : "0" + n; }`;
        const node = parseJssScript(ArrayTokenStream.fromString(source));
        expect(node).toEqual([
            { type: NodeType.Raw, value: 'function pad2(n) { return n.length > 1 ? n : "0" + n; }' }
        ]);
    });

    it('parses code with functions', () => {
        debugger;
        parseCode(`function pad2(n) { return n.length > 1 ? n : "0" + n; }
function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(g.toString(b)); }
.className {
  color: $\{rgb(255,255,255)\};
}`).toEqual([
    { type: NodeType.Raw, value: 'function pad2(n) { return n.length > 1 ? n : "0" + n; }' },
    {type: NodeType.Ignore, items: expect.anything()},
    { type: NodeType.Raw, value: 'function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(g.toString(b)); }' },
    {type: NodeType.Ignore, items: expect.anything()},
    { type: NodeType.JssBlock, selectors: [
        {
            type: NodeType.JssSelector,
            items: [".className"],
        }
    ], items: [
        {type: NodeType.Ignore, items: expect.anything()},
        {type: NodeType.JssDeclaration, prop: "color", value: "${rgb(255,255,255)}"},
        {type: NodeType.Ignore, items: expect.anything()},
    ]}
])
    });

});
