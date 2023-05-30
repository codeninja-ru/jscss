import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { jssLiteralReader, literalReader, makeBracketsReader, makeStringReader, makeSymbolReader, spaceReader, templateStringReader, unexpectedReader } from "./readers";

describe('makeStringReader()', () => {
    test('correct strings', () => {
        const stream1 = new StringInputStream(`'test string \\'' next`);
        const stream2 = new StringInputStream('"test string \\"" next');
        const stream3 = new StringInputStream(`".=<>-*+&|^@%?:#!\\\\"`);
        const reader1 = makeStringReader("'");
        const reader2 = makeStringReader('"');
        const reader3 = makeStringReader('"');

        expect(reader1(stream1)).toEqual({ "type": TokenType.String, "value": "'test string \\''", position: {line: 1, col: 1}});
        expect(reader2(stream2)).toEqual({ "type": TokenType.String, "value": "\"test string \\\"\"", position: {line: 1, col: 1}});
        expect(reader3(stream3)).toEqual({ "type": TokenType.String, "value": `".=<>-*+&|^@%?:#!\\\\"`, position: {line: 1, col: 1}});

    });

    it('parse brackets in strings', () => {
        const stream = new StringInputStream(`")"test`);
        expect(makeStringReader('"')(stream))
            .toEqual({ "type": TokenType.String, "value": `")"`, position: {line: 1, col: 1} });
    });

    test('incorect strings', () => {
        const streamNotClosed = new StringInputStream("'test string ");
        const streamNotOpened = new StringInputStream("test string '");
        const streamLineBreaked = new StringInputStream("'test \n string'");

        expect(() => makeStringReader("'")(streamNotClosed)).toThrow('(1:13) : unexpected end of the string');
        expect(() => makeStringReader("'")(streamLineBreaked)).toThrow('(2:1) : unexpected end of the string');
        expect(makeStringReader("'")(streamNotOpened)).toBeNull();

    });
});

describe('makeBracketsReader', () => {
    test('round brackets', () => {
        const stream = new StringInputStream('(arg1, foo(prop1, prop2[1]), ...rest) test of the stream');
        expect(makeBracketsReader('(', ')')(stream)).toEqual({ type: TokenType.RoundBrackets, value: '(arg1, foo(prop1, prop2[1]), ...rest)', position: expect.anything()  });
    });

    test('square brackets', () => {
        const stream = new StringInputStream('[1, 2, 3, [...array], 4] rest of the stream');
        expect(makeBracketsReader('[', ']')(stream)).toEqual({ type: TokenType.SquareBrackets, value: '[1, 2, 3, [...array], 4]', position: expect.anything()  });
    });

    test('brackets do not match', () => {
        {
            const stream = new StringInputStream('((1, 2)');
            expect(() => makeBracketsReader('(', ')')(stream))
                .toThrowError('(1:7) : brackets do not match');
        }
        {
            const stream = new StringInputStream('(1, 2');
            expect(() => makeBracketsReader('(', ')')(stream))
                .toThrowError('(1:5) : brackets do not match');
        }
    });

    test('single line comments', () => {
        const stream = new StringInputStream('( // )\n)test');
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: '( // )\n)', position: expect.anything()  });
    });

    test('multi-line comments', () => {
        const stream = new StringInputStream('( /* ) */)test');
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: '( /* ) */)', position: expect.anything()  });
    });

    test('string 1', () => {
        const stream = new StringInputStream(`(')')test`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(')')`, position: expect.anything()  });
    });

    test('string 1, not closed', () => {
        const stream = new StringInputStream(`(')`);
        expect(() => makeBracketsReader('(', ')')(stream))
            .toThrowError('(1:3) : string is not closed, line: 1');
    });

    test('string 1 + escape', () => {
        const stream = new StringInputStream(`(')\\'')test`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(')\\'')`, position: expect.anything()  });
    });

    test('string 2', () => {
        const stream = new StringInputStream(`(")")test`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(")")`, position: expect.anything()  });
    });

    test('string 2 + escape', () => {
        const stream = new StringInputStream(`(")\\"")test`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(")\\"")`, position: expect.anything()  });
    });

    test('escape', () => {
        const stream = new StringInputStream(`(\\))`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(\\))`, position: expect.anything()  });
    });

    test('escape 2', () => {
        const stream = new StringInputStream(`(\\(/)test`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(\\(/)`, position: expect.anything()  });
    });

    test('several strings', () => {
        const stream = new StringInputStream(`(">": { dir: "parentNode", first: true },)`);
        expect(makeBracketsReader('(', ')')(stream))
            .toEqual({ type: TokenType.RoundBrackets, value: `(">": { dir: "parentNode", first: true },)`, position: expect.anything()  });
    });


});

describe('templateStringReader', () => {
    test('simple template', () => {
        const stream = new StringInputStream('`hello, \\`${userName}\\`` rest of the stream');
        expect(templateStringReader(stream)).toEqual({ type: TokenType.TemplateString, value: '`hello, \\`${userName}\\``', position: expect.anything()  });
    });

    test('unexpected end of the string', () => {
        const stream = new StringInputStream('`hello');
        expect(() => templateStringReader(stream))
            .toThrowError('(1:6) : unexpected end of the template string')
    });

});

describe('makeSymbolReader()', () => {
    it('parses symbols', () => {
        const reader = makeSymbolReader();
        expect(reader(new StringInputStream("+test"))).toEqual({
            type: TokenType.Symbol,
            position: {col: 1, line: 1},
            value: '+',
        });
    });

    it('parses dollar sign', () => {
        const reader = makeSymbolReader();
        expect(reader(new StringInputStream("$test"))).toEqual({
            type: TokenType.Symbol,
            position: {col: 1, line: 1},
            value: '$',
        });
    });

});

describe('unexpectedReader()', () => {
    it('throws an exeption', () => {
        expect(() => unexpectedReader(new StringInputStream('test')))
            .toThrowError("(1:1) : unexpected symbol 't' code: ");
    });

});

describe('spaceReader()', () => {
    it('parses spaces', () => {
        expect(spaceReader(new StringInputStream("  \n\r end"))?.value).toEqual("  \n\r ");
    });
});

describe('literalReader()', () => {
    it('reads literals', () => {
        expect(literalReader(new StringInputStream('className .nextClassName'))?.value).toEqual('className');
        expect(literalReader(new StringInputStream('className, .nextClassName'))?.value).toEqual('className');
        expect(literalReader(new StringInputStream('className, .nextClassName'))?.value).toEqual('className');
        expect(literalReader(new StringInputStream('className:hover, .nextClassName'))?.value).toEqual('className');
    });

});

describe('jssLiteralReader', () => {
    it('reads literals', () => {
        expect(jssLiteralReader(new StringInputStream('className .nextClassName'))?.value).toEqual('className');
        expect(jssLiteralReader(new StringInputStream('className, .nextClassName'))?.value).toEqual('className');
        expect(jssLiteralReader(new StringInputStream('className, .nextClassName'))?.value).toEqual('className');
        expect(jssLiteralReader(new StringInputStream('className:hover, .nextClassName'))?.value).toEqual('className');

        expect(jssLiteralReader(new StringInputStream('${}'))).toEqual(null);
        expect(jssLiteralReader(new StringInputStream('$test'))?.value).toEqual('$test');
        expect(jssLiteralReader(new StringInputStream('test$test'))?.value).toEqual('test$test');
        expect(jssLiteralReader(new StringInputStream('test${test}'))?.value).toEqual('test');
        expect(jssLiteralReader(new StringInputStream('test$'))?.value).toEqual('test$');
    });
});
