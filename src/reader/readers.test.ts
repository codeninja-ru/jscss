import { StringInputStream } from "stream/input";
import { makeBracketsReader, makeSemicolonRader, makeStringReader, makeTemplateStringReader } from "./readers";

describe('makeStringReader()', () => {
    test('correct strings', () => {
        const reader1 = makeStringReader(new StringInputStream(`'test string \\'' next`), "'");
        const reader2 = makeStringReader(new StringInputStream('"test string \\"" next'), '"');

        expect(reader1()).toEqual({ "type": "string", "value": "'test string \\''" });
        expect(reader2()).toEqual({ "type": "string", "value": "\"test string \\\"\"" });
    });

    test('incorect strings', () => {
        const readerNotClosed = makeStringReader(new StringInputStream("'test string "), "'");
        const readerNotOpened = makeStringReader(new StringInputStream("test string '"), "'");
        const readerLineBreaked = makeStringReader(new StringInputStream("'test \n string'"), "'");

        expect(() => readerNotClosed()).toThrow('unexpected end of the string (1:13)');
        expect(() => readerLineBreaked()).toThrow('unexpected end of the string (2:0)');
        expect(readerNotOpened()).toBeNull();
    });
});

describe('makeBracketsReader', () => {
    test('round brackets', () => {
        const stream = new StringInputStream('(arg1, foo(prop1, prop2[1]), ...rest) test of the stream');
        expect(makeBracketsReader(stream, '(', ')')()).toEqual({ type: 'round_brackets', value: '(arg1, foo(prop1, prop2[1]), ...rest)' });
    });

    test('square brackets', () => {
        const stream = new StringInputStream('[1, 2, 3, [...array], 4] rest of the stream');
        expect(makeBracketsReader(stream, '[', ']')()).toEqual({ type: 'square_brackets', value: '[1, 2, 3, [...array], 4]' });
    });
});

describe('makeTemplateStringReader', () => {
    test('simple template', () => {
        const stream = new StringInputStream('`hello, \\`${userName}\\`` rest of the stream');
        expect(makeTemplateStringReader(stream)()).toEqual({ type: 'template_string', value: '`hello, \\`${userName}\\``' });
    });

});

describe('makeSemicolonReader', () => {
    test('semicolon', () => {
        expect(makeSemicolonRader(new StringInputStream(';rest'))()).toEqual({
            type: 'symbol',
            value: ';'
        });
    });

});
