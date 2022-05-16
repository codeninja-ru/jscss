import { StringInputStream } from "stream/input";
import { parseJssScript } from "./jssParser";
import { lexer } from "./lexer";
import { BlockType, NodeType } from "./syntaxTree";
import { ArrayTokenStream, GoAheadTokenStream } from "./tokenStream";

const SIMPLE = `import _ from 'lodash';
@import 'style.css';

const color = '#fff';

.className > a:hover {
    //color: \${color};
    color: white;
    backgound: #fff;
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
            {type: NodeType.CssImport, path: "'style.css'", rawValue: "\n@import 'style.css';"},
            {type: NodeType.Raw, value: "\n\nconst color = '#fff';"},
            {type: NodeType.CssBlock, selectors: [
                {
                    type: NodeType.CssSelector,
                    //TODO remove leading spaces
                    items: ["\n\n.className", " >", " a:hover"]
                },
            ], block: {
                type: NodeType.Block,
                blockType: BlockType.CurlyBracket,
                items: []

            }}
        ]);
    });
});
