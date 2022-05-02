import { Token } from "token";
import { makeLiteralToken } from "token/helpers";
import { ArrayTokenStream, CommonGoAheadTokenStream } from "./tokenStream";

describe('ArrayTokenStream', () => {
    test('all methods', () => {
        const tokens = [
            makeLiteralToken("i1", {line: 1, col: 1}),
            makeLiteralToken("i2", {line: 2, col: 1}),
            makeLiteralToken("i3", {line: 3, col: 1}),
            makeLiteralToken("i4", {line: 3, col: 1}),
            makeLiteralToken("i5", {line: 4, col: 1}),
        ] as Token[];

        const stream = new ArrayTokenStream(tokens);

        expect(stream.eof()).toBeFalsy();
        expect(stream.take(1).value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.peek().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.next().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.peek().value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.next().value).toEqual("i2");
        expect(stream.next().value).toEqual("i3");
        expect(stream.next().value).toEqual("i4");
        expect(stream.eof()).toBeFalsy();
        expect(stream.next().value).toEqual("i5");
        expect(stream.eof()).toBeTruthy();

    });
});

describe('CommonChildTokenStream', () => {
    test('all methods', () => {
        const tokens = [
            makeLiteralToken("i1", {line: 1, col: 1}),
            makeLiteralToken("i2", {line: 2, col: 1}),
            makeLiteralToken("i3", {line: 3, col: 1}),
            makeLiteralToken("i4", {line: 3, col: 1}),
            makeLiteralToken("i5", {line: 4, col: 1}),
        ] as Token[];

        const stream = new CommonGoAheadTokenStream(new ArrayTokenStream(tokens));

        expect(stream.eof()).toBeFalsy();
        expect(stream.take(1).value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.peek().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.next().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.peek().value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.next().value).toEqual("i2");
        expect(stream.next().value).toEqual("i3");
        expect(stream.next().value).toEqual("i4");
        expect(stream.eof()).toBeFalsy();
        expect(stream.next().value).toEqual("i5");
        expect(stream.eof()).toBeTruthy();

    });
});
