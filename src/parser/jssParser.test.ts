import { StringInputStream } from "stream/input";
import { parseJssScript } from "./jssParser";
import { lexer } from "./lexer";
import { NodeType } from "./syntaxTree";
import { ArrayTokenStream, CommonChildTokenStream } from "./tokenStream";

const SIMPLE = `import _ form 'lodash';
@import 'style.css';

const color = '#fff';

.clssName > a:hover {
    color: \${color};
    backgound: #fff;
}`;

describe('parseJssScript()', () => {
    test('simple script', () => {
        const tokens = lexer(new StringInputStream(SIMPLE));
        const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
        const node = parseJssScript(stream);

        expect(node.type).toEqual(NodeType.JssScript);
        expect(stream.rawValue()).toEqual(SIMPLE);
        expect(stream.eof()).toBeTruthy();
        expect(node.items).toEqual([]);
    });
});
