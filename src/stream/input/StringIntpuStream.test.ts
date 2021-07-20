import { StringInputStream } from "./StringInputStream";

describe('class StringInputStream', () => {
    test('for empty string', () => {
        expect((new StringInputStream('')).isEof()).toBe(true);
    });

    test('one line string', () => {
        const input = new StringInputStream('hello world');
        expect(input.isEof()).toBeFalsy();
        expect(input.peek()).toEqual('h');
        expect(input.peek()).toEqual('h');
        expect(input.next()).toEqual('h');
        expect(input.next()).toEqual('e');
    });

    test('next() and isEof', () => {
        const input = new StringInputStream('');
        expect(() => {
            input.next();
        }).toThrowError('reading beyond the end of the stream');
    });

    test('readUntil()', () => {
        const input = new StringInputStream('test 123\nqwerty');
        expect(input.formatError('error')).toEqual(new Error('error (1:0)'));
        expect(input.readUntil('123')).toEqual('test 123');
        expect(input.readUntil('123')).toBeNull();
        expect(input.readUntil('test')).toBeNull();
        expect(input.formatError('error')).toEqual(new Error('error (1:0)'));
        expect(input.readUntil('qwerty')).toEqual('\nqwerty');
        expect(input.readUntil('qwerty')).toBeNull();
        expect(input.formatError('error')).toEqual(new Error('error (2:0)'));
    });
});