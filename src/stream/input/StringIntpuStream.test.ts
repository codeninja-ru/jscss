import { StringInputStream } from "./StringInputStream";

describe('class StringInputStream', () => {
    test('for empty string', () => {
        expect((new StringInputStream('')).isEof()).toBe(true);
        expect((new StringInputStream('')).position()).toEqual({line: 1, col: 1});
    });

    test('one line string', () => {
        const input = new StringInputStream('hello world');
        expect(input.isEof()).toBeFalsy();
        expect(input.position()).toEqual({line: 1, col: 1});
        expect(input.peek()).toEqual('h');
        expect(input.position()).toEqual({line: 1, col: 1});
        expect(input.peek()).toEqual('h');
        expect(input.next()).toEqual('h');
        expect(input.position()).toEqual({line: 1, col: 2});
        expect(input.next()).toEqual('e');
        expect(input.position()).toEqual({line: 1, col: 3});
    });

    test('next() and isEof', () => {
        const input = new StringInputStream('');
        expect(() => {
            input.next();
        }).toThrowError('reading beyond the end of the stream');
    });

    test('readUntil()', () => {
        let input = new StringInputStream('test 123_qwerty');
        expect(input.formatError('error')).toEqual(new Error('(1:1) : error'));
        expect(input.readUntil('123')).toEqual('test 123');
        expect(input.readUntil('123')).toEqual('_qwerty')
        expect(input.readUntil('test')).toEqual('');
        expect(input.formatError('error')).toEqual(new Error('(1:1) : error'));

        input = new StringInputStream('test 123\nqwerty');
        expect(input.readUntil('123')).toEqual('test 123');
        expect(input.readUntil('qwerty')).toEqual('\nqwerty');
        expect(input.readUntil('qwerty')).toEqual('');
        expect(input.formatError('error')).toEqual(new Error('(2:1) : error'));

        input = new StringInputStream('/* test */no');
        input.next();
        input.next();
        expect(input.readUntil('*/')).toEqual(' test */');
        expect(input.readUntil('test')).toEqual('no');
    });
});
