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
});