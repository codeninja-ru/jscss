import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeBracketsReader, makeRegExpReader, makeStringReader, makeSymbolReader, makeTemplateStringReader } from "./readers";

describe('makeStringReader()', () => {
    test('correct strings', () => {
        const reader1 = makeStringReader(new StringInputStream(`'test string \\'' next`), "'");
        const reader2 = makeStringReader(new StringInputStream('"test string \\"" next'), '"');

        expect(reader1()).toEqual({ "type": TokenType.String, "value": "'test string \\''", position: {line: 1, col: 1}});
        expect(reader2()).toEqual({ "type": TokenType.String, "value": "\"test string \\\"\"", position: {line: 1, col: 1}});
    });

    test('incorect strings', () => {
        const readerNotClosed = makeStringReader(new StringInputStream("'test string "), "'");
        const readerNotOpened = makeStringReader(new StringInputStream("test string '"), "'");
        const readerLineBreaked = makeStringReader(new StringInputStream("'test \n string'"), "'");

        expect(() => readerNotClosed()).toThrow('unexpected end of the string (1:14)');
        expect(() => readerLineBreaked()).toThrow('unexpected end of the string (2:1)');
        expect(readerNotOpened()).toBeNull();
    });
});

describe('makeBracketsReader', () => {
    test('round brackets', () => {
        const stream = new StringInputStream('(arg1, foo(prop1, prop2[1]), ...rest) test of the stream');
        expect(makeBracketsReader(stream, '(', ')')()).toEqual({ type: TokenType.RoundBrackets, value: '(arg1, foo(prop1, prop2[1]), ...rest)', position: expect.anything()  });
    });

    test('square brackets', () => {
        const stream = new StringInputStream('[1, 2, 3, [...array], 4] rest of the stream');
        expect(makeBracketsReader(stream, '[', ']')()).toEqual({ type: TokenType.SquareBrackets, value: '[1, 2, 3, [...array], 4]', position: expect.anything()  });
    });
});

describe('makeTemplateStringReader', () => {
    test('simple template', () => {
        const stream = new StringInputStream('`hello, \\`${userName}\\`` rest of the stream');
        expect(makeTemplateStringReader(stream)()).toEqual({ type: TokenType.TemplateString, value: '`hello, \\`${userName}\\``', position: expect.anything()  });
    });

});

describe('makeRegExpReader', () => {
    test('empty', () => {
        const reader = makeRegExpReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });

    test('regexp', () => {
        const reader = makeRegExpReader(new StringInputStream(/[a-z]*\/(.?)/gi + ""));
        expect(reader()).toEqual({
            type: TokenType.SlashBrackets,
            position: expect.anything(),
            value: "/[a-z]*\\/(.?)/"
        });
    });

    test('ignores comments', () => {
        const reader = makeRegExpReader(new StringInputStream("//[a-z]*\/'(*?)/gi"));
        expect(reader()).toBeNull();
    });

    test('throws error', () => {
        const reader = makeRegExpReader(new StringInputStream("/[a-z]*\\/'(*?"));
        //thows error
        expect(() => {
            reader();
        }).toThrowError('unexpected end of the regexp (1:14)');
    });
});

describe('makeSymbolReader()', () => {
    it('parses symbols', () => {
        const reader = makeSymbolReader(new StringInputStream("+test"));
        expect(reader()).toEqual({
            type: TokenType.Symbol,
            position: {col: 1, line: 1},
            value: '+',
        });
    });
});
