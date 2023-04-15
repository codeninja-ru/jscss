import { StringInputStream } from "stream/input";
import { Position } from "stream/position";
import { TokenType } from "token";
import { makeCommaToken, makeLazyBlockToken, makeLiteralToken, makeRoundBracketsToken, makeSpaceToken, makeSquareBracketsToken, makeStringToken, makeSymbolToken } from "token/helpers";
import { jssLexer } from "./jssLexer";

const impr = makeLiteralToken('import');
const sp = makeSpaceToken();
const spn = makeSpaceToken("\n");
const spnspn = makeSpaceToken("\n\n");
const lodash = makeLiteralToken('_');
const frm = makeLiteralToken('from');
const smcl = makeSymbolToken(';');
const dot = makeSymbolToken('.');
const comma = makeCommaToken();
const semcol = () => makeSymbolToken(';');
const col = () => makeSymbolToken(':');
const minus = () => makeSymbolToken('-');
const space = () => makeSpaceToken(' ');

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

const CSS_BLOCK_CONTENT = `
    // all this should be valid jscss
    ...classNameBase.prop;
    ...classNameBase(x);
    [generateProp]: bold;
    font-weight: \${test ? 'bold' : 'normal'\};
    font-size: \${getSize()}px;
    color: white;
    background: #fff;
    font-family: 'Arial', sans-serif;
    .childClassName {
        color: red;
    }
`;

describe('parseStream()', () => {
    test('simple css', () => {
        const tokens = jssLexer(new StringInputStream(SIMPLE_CSS));
        expect(tokens).toEqual([
            {type: TokenType.Space, value: "\n", position: {line: 1, col: 1}},
            { type: TokenType.Comment, position: {line: 2, col: 1}, value: '// this is a comment' },
            spnspn,
            {type: TokenType.Symbol, value: '.', position: {line: 4, col: 1}},
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
}`, position: {line: 4, col: 12},
            },
            spn,
        ]);
    });

    test('content of the css block', () => {
        const tokens = jssLexer(new StringInputStream(CSS_BLOCK_CONTENT));
        const anySpace = () => { return {type: TokenType.Space, value: expect.anything(), position: expect.anything()} };
        expect(tokens).toEqual([
            {type: TokenType.Space, value: "\n    ", position: {line: 1, col: 1}},
            { type: TokenType.Comment, position: {line: 2, col: 5}, value: '// all this should be valid jscss' },
            anySpace(),
            dot, dot, dot, makeLiteralToken('classNameBase'), makeSymbolToken('.'), makeLiteralToken('prop'), semcol(),
            anySpace(),
            dot, dot, dot, makeLiteralToken('classNameBase'), makeRoundBracketsToken('(x)'), semcol(),
            anySpace(),
            makeSquareBracketsToken('[generateProp]'), col(), space(), makeLiteralToken('bold'), semcol(),
            anySpace(),
            makeLiteralToken('font'), minus(), makeLiteralToken('weight'), col(), space(), makeLiteralToken('$'), makeLazyBlockToken("{test ? 'bold' : 'normal'\}"), semcol(),
            anySpace(),
            makeLiteralToken('font'), minus(), makeLiteralToken('size'), col(), space(), makeLiteralToken('$'), makeLazyBlockToken('{getSize()}'), makeLiteralToken('px'), semcol(),
            anySpace(),
            makeLiteralToken('color'), col(), space(), makeLiteralToken('white'), semcol(),
            anySpace(),
            makeLiteralToken('background'), col(), space(), makeSymbolToken('#'), makeLiteralToken('fff'), semcol(),
            anySpace(),
            makeLiteralToken('font'), minus(), makeLiteralToken('family'), col(), space(), makeStringToken("'Arial'"), comma, space(), makeLiteralToken('sans'), minus(), makeLiteralToken('serif'), semcol(),
            anySpace(),
            makeSymbolToken('.'), makeLiteralToken('childClassName'), space(), makeLazyBlockToken(expect.anything()),
            anySpace(),
        ]);
    });


    test('javascript', () => {
        const tokens = jssLexer(new StringInputStream("import _ from 'lodash';\n"));
        expect(tokens).toEqual([
            impr,
            sp,
            lodash,
            sp,
            frm,
            sp,
            makeStringToken("'lodash'"),
            smcl,
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
        const tokens = jssLexer(new StringInputStream(SIMPLE_JSCSS));
        expect(tokens).toEqual([
            spn,
            impr, sp, lodash, sp, frm, sp, makeStringToken("'lodash'"), smcl, spn,
            impr, sp, makeLazyBlockToken('{foo}'), sp, frm, sp,
            makeStringToken("'bar'"), smcl,
            spnspn,
            makeLiteralToken('const'), sp, makeLiteralToken('BACKGROUD_COLOR'), sp,
            makeSymbolToken('='), sp, makeStringToken("'#fff'"), smcl,
            spnspn,
            makeLiteralToken('function'), sp, makeLiteralToken('process'),
            makeRoundBracketsToken('(css)'), sp, makeLazyBlockToken("{\n    return _(css).map((val) => val + 1);\n}"),
            spnspn,
            makeSymbolToken('.'), makeLiteralToken('className'), comma, sp, makeLiteralToken('tagName'), comma, sp,
            makeSymbolToken('#'), makeLiteralToken('elementId'), comma, sp,
            makeSymbolToken('.'), makeLiteralToken('className'), makeSymbolToken(':'),
            makeLiteralToken('hover'), sp,
            makeLazyBlockToken("{\n    color: #eee;\n    foo: $\{foo\};\n}"), spn
        ]);
    });

    test('simple condition', () => {
        const tokens = jssLexer(new StringInputStream(`1 != 2 ? yes : no`));
        expect(tokens).toEqual([
            makeLiteralToken('1'), sp, makeSymbolToken('!'), makeSymbolToken('='), sp,
            makeLiteralToken('2'), sp, makeSymbolToken('?'), sp,
            makeLiteralToken('yes'), sp, makeSymbolToken(':'), sp,
            makeLiteralToken('no')
        ]);
    });

    test('simple javascript var', () => {
        const tokens = jssLexer(new StringInputStream(`var name = fn(1,2)[1,2].test`));
        expect(tokens).toEqual([
            makeLiteralToken("var"), sp, makeLiteralToken('name'), sp, makeSymbolToken('='),
            sp, makeLiteralToken('fn'), makeRoundBracketsToken("(1,2)"),
            makeSquareBracketsToken('[1,2]'),
            makeSymbolToken('.'), makeLiteralToken('test')
        ]);
    });

    test('conditions', () => {
        const tokens = jssLexer(new StringInputStream(`test?true:false`));
        expect(tokens).toEqual([
            makeLiteralToken('test'), makeSymbolToken('?'),
            makeLiteralToken('true'), makeSymbolToken(':'),
            makeLiteralToken('false')
        ]);
    });

    test('semicolon', () => {
        const tokens = jssLexer(new StringInputStream(`++;--`));
        expect(tokens).toEqual([
            makeSymbolToken('+'), makeSymbolToken('+'), smcl, makeSymbolToken('-'), makeSymbolToken('-')
        ]);
    });

    test('css important', () => {
        const script = '!important';
        const tokens = jssLexer(new StringInputStream(script));
        expect(tokens).toEqual([
            makeSymbolToken('!'), makeLiteralToken('important')
        ]);
    });

    test('lodash is the part of the literal', () => {
        const script = 'var_name';
        const tokens = jssLexer(new StringInputStream(script));
        expect(tokens).toEqual([
            makeLiteralToken('var_name')
        ]);
    });

    test('correct position', () => {
        const tokens = jssLexer(new StringInputStream(`[hi]`));
        expect(tokens).toEqual([
            { type: TokenType.SquareBrackets, value: '[hi]', position: {line: 1, col: 1} },
        ]);
    });

    test('css sizes', () => {
        const tokens = jssLexer(new StringInputStream(`10% 10px 0.1em`));
        expect(tokens).toEqual([
            makeLiteralToken('10'), makeSymbolToken('%'),
            makeSpaceToken(),
            makeLiteralToken('10px'),
            makeSpaceToken(),
            makeLiteralToken('0'), makeSymbolToken('.'), makeLiteralToken('1em'),
        ]);
    });

    test('shebang', () => {
        const tokens = jssLexer(new StringInputStream(`#!/bin/sh`));
        expect(tokens).toEqual([
            makeSymbolToken('#'), makeSymbolToken('!'), makeSymbolToken('/'),
            makeLiteralToken('bin'),
            makeSymbolToken('/'),
            makeLiteralToken('sh')
        ])
    });

    test('empty string', () => {
        const tokens = jssLexer(new StringInputStream(''));
        expect(tokens).toEqual([]);
    });

    test('empty blocks', () => {
        const tokens = jssLexer(new StringInputStream('{}'));
        expect(tokens).toEqual([
            makeLazyBlockToken('{}'),
        ]);
    });

});

describe('tricky cases', () => {
    it('ignores brackets in multiline comments', () => {
        const code = `( { /* 1) test */ });`;
        const tokens = jssLexer(new StringInputStream(code));

        expect(tokens).toEqual([
            {
                type: TokenType.RoundBrackets,
                value: "( { /* 1) test */ })",
                position: new Position(1, 1)
            },
            {
                type: TokenType.Symbol,
                value: ";",
                position: new Position(1, 10)
            },
        ]);
    });

    it('ignores brackets in single comments', () => {
        const code = `( { // 1) test \n});`;
        const tokens = jssLexer(new StringInputStream(code));
        expect(tokens).toEqual([
            {
                type: TokenType.RoundBrackets,
                value: "( { // 1) test \n})",
                position: new Position(1, 1)
            },
            {
                type: TokenType.Symbol,
                value: ";",
                position: new Position(2, 3)
            },
        ]);
    });

    it('ignores strings', () => {
        {
            const code = `('1)')`;
            const tokens = jssLexer(new StringInputStream(code));
            expect(tokens).toEqual([
                {
                    type: TokenType.RoundBrackets,
                    value: "('1)')",
                    position: new Position(1, 1)
                },
            ]);
        }
        {
            const code = `("1)")`;
            const tokens = jssLexer(new StringInputStream(code));
            expect(tokens).toEqual([
                {
                    type: TokenType.RoundBrackets,
                    value: '("1)")',
                    position: new Position(1, 1)
                },
            ]);
        }
        {
            const code = `(\`1)\`)`;
            const tokens = jssLexer(new StringInputStream(code));
            expect(tokens).toEqual([
                {
                    type: TokenType.RoundBrackets,
                    value: `(\`1)\`)`,
                    position: new Position(1, 1)
                },
            ]);
        }

    });

    it('ignores escapes', () => {
            const code = `(/[a-b]\\(/)`;
            const tokens = jssLexer(new StringInputStream(code));
            expect(tokens).toEqual([
                {
                    type: TokenType.RoundBrackets,
                    value: `(/[a-b]\\(/)`,
                    position: new Position(1, 1)
                },
            ]);
    });

    it('tries to detect urls', () => {
        const code = 'url(http://www.w3.org/1999/xhtml);';
        const tokens = jssLexer(new StringInputStream(code));
        expect(tokens).toEqual([
            {
                type: TokenType.Literal,
                value: "url",
                position: new Position(1, 1)
            },
            {
                type: TokenType.RoundBrackets,
                value: "(http://www.w3.org/1999/xhtml)",
                position: new Position(1, 4)
            },
            {
                type: TokenType.Symbol,
                value: ";",
                position: new Position(1, 34)
            },
        ]);
    });

    it('badurl', () => {
        const code = `url(//testurl.local)`;
        const token = jssLexer(new StringInputStream(code));
        expect(token).toEqual([
            {
                type: TokenType.Literal,
                value: "url",
                position: new Position(1, 1)
            },
            {
                type: TokenType.RoundBrackets,
                value: "(//testurl.local)",
                position: new Position(1, 4)
            },
        ]);
    });
});
