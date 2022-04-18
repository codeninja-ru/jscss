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
        let input = new StringInputStream('test 123_qwerty');
        expect(input.formatError('error')).toEqual(new Error('error (1:0)'));
        expect(input.readUntil('123')).toEqual('test 123');
        expect(input.readUntil('123')).toEqual('_qwerty')
        expect(input.readUntil('test')).toEqual('');
        expect(input.formatError('error')).toEqual(new Error('error (1:0)'));

        input = new StringInputStream('test 123\nqwerty');
        expect(input.readUntil('123')).toEqual('test 123');
        expect(input.readUntil('qwerty')).toEqual('\nqwerty');
        expect(input.readUntil('qwerty')).toEqual('');
        expect(input.formatError('error')).toEqual(new Error('error (2:0)'));
    });
});
