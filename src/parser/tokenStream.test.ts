import { Position } from "stream/position";
import { Token } from "token";
import { makeLiteralToken } from "token/helpers";
import { ArrayTokenStream, LookAheadTokenStream } from "./tokenStream";

describe('ArrayTokenStream', () => {
    test('can be empty', () => {
        const stream = new ArrayTokenStream([]);
        expect(stream.eof()).toBeTruthy();
        expect(stream.currentPosition()).toEqual(0);
    });

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

        const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));

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

    describe('sourceFragment()', () => {
        it('returns a source fragment', () => {
            const tokens = [
                makeLiteralToken("i1", {line: 1, col: 1}),
                makeLiteralToken("i2", {line: 2, col: 1}),
                makeLiteralToken("i3", {line: 3, col: 1}),
                makeLiteralToken("i4", {line: 4, col: 1}),
                makeLiteralToken("i5", {line: 5, col: 1}),
            ] as Token[];

            const parentStream = new ArrayTokenStream(tokens);
            var stream = new LookAheadTokenStream(parentStream);
            stream.next();
            stream.next();

            var sourceFragment = stream.sourceFragment();
            expect(sourceFragment.position).toEqual(new Position(1, 1));
            expect(sourceFragment.value).toEqual('i1i2');
            expect(sourceFragment.tokens).toEqual([
                makeLiteralToken("i1", {line: 1, col: 1}),
                makeLiteralToken("i2", {line: 2, col: 1}),
            ]);
            stream.flush();

            stream = new LookAheadTokenStream(parentStream);
            stream.next();
            stream.next();
            stream.next();
            sourceFragment = stream.sourceFragment();
            expect(sourceFragment.position).toEqual(new Position(3, 1));
            expect(sourceFragment.value).toEqual('i3i4i5');
            expect(sourceFragment.tokens).toEqual([
                makeLiteralToken("i3", {line: 3, col: 1}),
                makeLiteralToken("i4", {line: 4, col: 1}),
                makeLiteralToken("i5", {line: 5, col: 1}),
            ]);
            stream.flush();

            stream = new LookAheadTokenStream(parentStream);
            sourceFragment = stream.sourceFragment();
            expect(sourceFragment.position).toEqual(new Position(5, 1));
            expect(sourceFragment.value).toEqual('');
            expect(sourceFragment.tokens).toEqual([]);

        });

    });


});
