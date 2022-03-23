import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeCommaToken, makeLazyBlockToken, makeLiteralToken, makeRoundBracketsToken, makeSemicolonToken, makeSpaceToken, makeSquareBracketsToken, makeStringToken, makeSymbolToken } from "token/helpers";
import { lexer } from "./lexer";

const impr = makeLiteralToken('import');
const sp = makeSpaceToken();
const spn = makeSpaceToken("\n");
const spnspn = makeSpaceToken("\n\n");
const lodash = makeLiteralToken('_');
const frm = makeLiteralToken('from');
const smcl = makeSemicolonToken();
const comma = makeCommaToken();


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

describe('parseStream()', () => {
    test('simple css', () => {
        const tokens = lexer(new StringInputStream(SIMPLE_CSS));
        expect(tokens).toEqual([
            spn,
            { type: TokenType.Comment, value: '// this is a comment' },
            spnspn,
            makeSymbolToken('.'),
            makeLiteralToken('className'),
            sp,
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
            spn,
        ]);
    });

    test('javascript', () => {
        const tokens = lexer(new StringInputStream("import _ from 'lodash';\n"));
        expect(tokens).toEqual([
            impr,
            sp,
            lodash,
            sp,
            frm,
            sp,
            makeStringToken("'lodash'"),
            makeSemicolonToken(),
            spn,
        ]);
    });

    // TODO can color be not a string by #fff without '' ?
const SIMPLE_JSCSS = `
import _ from 'lodash';
import {foo} from 'bar';

const BACKGROUD_COLOR = '#fff';

function process(css) {
    return _(css).map((val) => val + 1);
}

.className, tagName, #elementId, .className:hover {
    color: #eee;
    foo: $\{foo\};
}
`;

    test('simple jscss', () => {
        const tokens = lexer(new StringInputStream(SIMPLE_JSCSS));
        expect(tokens).toEqual([
            spn,
            impr, sp, lodash, sp, frm, sp, makeStringToken("'lodash'"), smcl, spn,
            impr, sp, makeLazyBlockToken('{foo}'), sp, frm, sp, makeStringToken("'bar'"), smcl,
            spnspn,
            makeLiteralToken('const'), sp, makeLiteralToken('BACKGROUD_COLOR'), sp, makeSymbolToken('='), sp, makeStringToken("'#fff'"), smcl,
            spnspn,
            makeLiteralToken('function'), sp, makeLiteralToken('process'), makeRoundBracketsToken('(css)'), sp, makeLazyBlockToken("{\n    return _(css).map((val) => val + 1);\n}"),
            spnspn,
            makeSymbolToken('.'), makeLiteralToken('className'), comma, sp, makeLiteralToken('tagName'), comma, sp, makeLiteralToken('#elementId'), comma, sp,
            makeSymbolToken('.'), makeLiteralToken('className:hover'), sp,
            makeLazyBlockToken("{\n    color: #eee;\n    foo: $\{foo\};\n}"), spn
        ]);
    });

    test('simple javascript var', () => {
        const tokens = lexer(new StringInputStream(`var name = fn(1,2)[1,2].test`));
        expect(tokens).toEqual([
            makeLiteralToken("var"), sp, makeLiteralToken('name'), sp, makeSymbolToken('='),
            sp, makeLiteralToken('fn'), makeRoundBracketsToken("(1,2)"),
            makeSquareBracketsToken('[1,2]'),
            makeSymbolToken('.'), makeLiteralToken('test')
        ]);
    });
});
