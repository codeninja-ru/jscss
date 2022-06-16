import { StringInputStream } from "stream/input";
import { parseJssScript } from "./jssParser";
import { lexer } from "./lexer";
import { BlockType, NodeType } from "./syntaxTree";
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

describe('parseJssScript()', () => {
    it('simple script', () => {
        const tokens = lexer(new StringInputStream(SIMPLE));
        const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));
        const node = parseJssScript(stream);

        expect(node.type).toEqual(NodeType.JssScript);
        expect(stream.rawValue()).toEqual(SIMPLE);
        expect(stream.eof()).toBeTruthy();
        expect(node.items).toEqual([
            {type: NodeType.Raw, value: "import _ from 'lodash';"},
            {type: NodeType.Ignore, items: ["\n"]},
            {type: NodeType.CssImport, path: "'style.css'", rawValue: "@import 'style.css';"},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.Raw, value: "const color = '#fff';"},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssBlock, selectors: [
                {
                    type: NodeType.CssSelector,
                    items: [".className", " >", " a:hover"]
                },
            ], block: {
                type: NodeType.Block,
                blockType: BlockType.CurlyBracket,
                items: [
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "color", value: "${color}"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "font-family", value: "'Arial', sans-serif"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JssDeclaration, prop: "background", value: "#fff"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.JsSpread, value: "...extend(color)"},
                    {type: NodeType.Ignore, items: expect.anything()},
                    {type: NodeType.CssBlock, selectors: [
                        {
                            type: NodeType.CssSelector,
                            items: [".subClass", " +", " a:hover"]
                        },
                    ], block: {
                        type: NodeType.Block,
                        blockType: BlockType.CurlyBracket,
                        items: [
                            {type: NodeType.Ignore, items: expect.anything()},
                            {type: NodeType.JssDeclaration, prop: "color", value: "red"},
                            {type: NodeType.Ignore, items: expect.anything()},
                        ]
                    }},
                    {type: NodeType.Ignore, items: expect.anything()},
                ]
            }}
        ]);
    });
});
