import { Token, TokenType } from "token";
import { ArraySourceFragment, LeftTrimSourceFragment } from "./sourceFragment";

const array = [
    {type: TokenType.Literal, value: '1', position: {line: 2, col: 1}},
    {type: TokenType.Literal, value: '2', position: {line: 2, col: 2}},
    {type: TokenType.Literal, value: '3', position: {line: 2, col: 3}},
    {type: TokenType.Literal, value: '4', position: {line: 2, col: 4}},
    {type: TokenType.Literal, value: '5', position: {line: 2, col: 5}},
    {type: TokenType.Literal, value: '6', position: {line: 2, col: 6}},
] as Token[];

describe('class ArraySourceFragment', () => {
    it('holds an array of tokens', () => {
        const fragment = new ArraySourceFragment(array);

        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("123456");
        expect(fragment.tokens).toEqual(array);
    });

    it('works with an empty array', () => {
        const fragment = new ArraySourceFragment([]);

        expect(fragment.position).toEqual(undefined);
        expect(fragment.value).toEqual("");
        expect(fragment.tokens).toEqual([]);
    });

});

describe('class LeftTrimSourceFragment', () => {
    it('trims space tokens from the top of the array', () => {
        const arrayWithSpaces = [
            {type: TokenType.Space, value: 'no', position: {line: 1, col: 1}},
            {type: TokenType.Comment, value: 'no', position: {line: 1, col: 1}},
            {type: TokenType.Literal, value: '1', position: {line: 2, col: 1}},
            {type: TokenType.Comment, value: 'no', position: {line: 1, col: 1}},
            {type: TokenType.Literal, value: '2', position: {line: 2, col: 2}},
            {type: TokenType.Literal, value: '3', position: {line: 2, col: 3}},
            {type: TokenType.Literal, value: '4', position: {line: 2, col: 4}},
            {type: TokenType.Literal, value: '5', position: {line: 2, col: 5}},
            {type: TokenType.Literal, value: '6', position: {line: 2, col: 6}},
        ] as Token[];
        const fragment = new LeftTrimSourceFragment(new ArraySourceFragment(arrayWithSpaces));

        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("1no23456");
        expect(fragment.tokens).toEqual([
            {type: TokenType.Literal, value: '1', position: {line: 2, col: 1}},
            {type: TokenType.Comment, value: 'no', position: {line: 1, col: 1}},
            {type: TokenType.Literal, value: '2', position: {line: 2, col: 2}},
            {type: TokenType.Literal, value: '3', position: {line: 2, col: 3}},
            {type: TokenType.Literal, value: '4', position: {line: 2, col: 4}},
            {type: TokenType.Literal, value: '5', position: {line: 2, col: 5}},
            {type: TokenType.Literal, value: '6', position: {line: 2, col: 6}},
        ]);
        // try again
        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("1no23456");
        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("1no23456");
        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("1no23456");
    });

    it('does nothing without the left spaces', () => {
        const fragment = new LeftTrimSourceFragment(new ArraySourceFragment(array));

        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("123456");
        expect(fragment.tokens).toEqual(array);
        // try again
        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("123456");
        expect(fragment.tokens).toEqual(array);
        expect(fragment.position).toEqual({line: 2, col: 1});
        expect(fragment.value).toEqual("123456");
        expect(fragment.tokens).toEqual(array);
    });

    it('works correctly with empty tokens', () => {
        {
            const array = [
                {type: TokenType.Space, value: '\n\n', position: {line: 1, col: 1}},
                {type: TokenType.Space, value: '\n\n', position: {line: 4, col: 1}},
            ] as Token[];
            const fragment = new LeftTrimSourceFragment(new ArraySourceFragment(array));

            expect(fragment.position).toEqual({line: 1, col: 1});
            expect(fragment.value).toEqual("");
            expect(fragment.tokens).toEqual(array);
        }
        {
            const fragment = new LeftTrimSourceFragment(new ArraySourceFragment([]));

            expect(fragment.position).toEqual({line: 1, col: 1});
            expect(fragment.value).toEqual("");
            expect(fragment.tokens).toEqual(array);
        }
    });


});
