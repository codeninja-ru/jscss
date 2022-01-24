import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { lexer } from "./lexer";

const SIMPLE_CSS = `
// this is a comment

.className {
    ...classNameBase.prop;
    [generateProp]: bold;
    font-weight: $\{test ? 'bold' : 'normal'\};
    font-size: 12px;
    color: $\{color("#eee")\};
    background: $\{func()\};
}
`;

/*const SIMPLE_JS = `
import _ from 'lodash';
import {foo} from 'bar';

function process(css) {
    return _(css).map((val) => val + 1);
}

.className {
    color: #eee;
    foo: $\{foo\};
}
`;*/


describe('parseStream()', () => {
    test('simple css', () => {
        const tokens = lexer(new StringInputStream(SIMPLE_CSS));
        expect(tokens).toEqual([
            { type: TokenType.Space, value: "\n" },
            { type: TokenType.Comment, value: '// this is a comment' },
            { type: TokenType.Space, value: "\n\n" },
            { type: TokenType.Literal, value: '.className' },
            { type: TokenType.Space, value: " " },
            {
                type: TokenType.LazyBlock, value: `{
    ...classNameBase.prop;
    [generateProp]: bold;
    font-weight: \$\{test ? 'bold' : 'normal'\};
    font-size: 12px;
    color: \$\{color(\"#eee\")\};
    background: \$\{func()\};
}`
            },
            { type: TokenType.Space, value: "\n" },
        ]);
    });

    test('javascript', () => {
        const tokens = lexer(new StringInputStream("import _ from 'lodash';\n"));
        expect(tokens).toEqual([
            { type: TokenType.Literal, value: 'import' },
            { type: TokenType.Space, value: ' ' },
            { type: TokenType.Literal, value: '_' },
            { type: TokenType.Space, value: ' ' },
            { type: TokenType.Literal, value: 'from' },
            { type: TokenType.Space, value: ' ' },
            { type: TokenType.String, value: "'lodash'" },
            { type: TokenType.Symbol, value: ';' },
            { type: TokenType.Space, value: '\n' }
        ]);
    });

});
