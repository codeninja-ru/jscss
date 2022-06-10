import { StringInputStream } from "stream/input";
import { parseJssScript } from "./jssParser";
import { lexer } from "./lexer";
import { BlockType, NodeType } from "./syntaxTree";
import { ArrayTokenStream, GoAheadTokenStream } from "./tokenStream";

/*const SIMPLE = `import _ from 'lodash';
@import 'style.css';

const color = '#fff';

.className > a:hover {
    color: \${color};
    font-family: 'Arail';
    backgound: #fff;
}`;
*/

const SIMPLE1 = `.className > a:hover {
    color: \${color};
    font-family: 'Arail';
    backgound: #fff;
}`;

describe('parseJssScript()', () => {
    it('simple script', () => {
        const tokens = lexer(new StringInputStream(SIMPLE1));
        const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));
        debugger;
        const node = parseJssScript(stream);

        expect(node.type).toEqual(NodeType.JssScript);
        expect(stream.rawValue()).toEqual(SIMPLE1);
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
                items: []

            }}
        ]);
    });
});
