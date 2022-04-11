import { Token } from "token";
import { makeLiteralToken } from "token/helpers";
import { ArrayTokenStream, CommonChildTokenStream } from "./tokenStream";

describe('ArrayTokenStream', () => {
    test('all methods', () => {
        const tokens = [
            makeLiteralToken("i1"),
            makeLiteralToken("i2"),
            makeLiteralToken("i3"),
            makeLiteralToken("i4"),
            makeLiteralToken("i5"),
        ] as Token[];

        const stream = new ArrayTokenStream(tokens);

        expect(stream.eof()).toBeFalsy();
        expect(stream.take(1).value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.takeNext().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.next().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.takeNext().value).toEqual("i2");
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
            makeLiteralToken("i1"),
            makeLiteralToken("i2"),
            makeLiteralToken("i3"),
            makeLiteralToken("i4"),
            makeLiteralToken("i5"),
        ] as Token[];

        const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));

        expect(stream.eof()).toBeFalsy();
        expect(stream.take(1).value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.takeNext().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(0);
        expect(stream.next().value).toEqual("i1");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.takeNext().value).toEqual("i2");
        expect(stream.currentPosition()).toEqual(1);
        expect(stream.next().value).toEqual("i2");
        expect(stream.next().value).toEqual("i3");
        expect(stream.next().value).toEqual("i4");
        expect(stream.eof()).toBeFalsy();
        expect(stream.next().value).toEqual("i5");
        expect(stream.eof()).toBeTruthy();

    });
});
