import { StringInputStream } from "stream/input";
import { parseJssScript } from "./jssParser";
import { lexer } from "./lexer";
import { NodeType } from "./syntaxTree";
import { ArrayTokenStream, CommonGoAheadTokenStream } from "./tokenStream";

const SIMPLE = `import _ from 'lodash';
@import 'style.css';

const color = '#fff';

.clssName > a:hover {
    //color: \${color};
    color: white;
    backgound: #fff;
}`;

describe('parseJssScript()', () => {
    it('simple script', () => {
        const tokens = lexer(new StringInputStream(SIMPLE));
        const stream = new CommonGoAheadTokenStream(new ArrayTokenStream(tokens));
        const node = parseJssScript(stream);

        expect(node.type).toEqual(NodeType.JssScript);
        expect(stream.rawValue()).toEqual(SIMPLE);
        expect(stream.eof()).toBeTruthy();
        expect(node.items).toEqual([]);
    });
});
