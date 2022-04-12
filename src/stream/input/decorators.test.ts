import { StringInputStream } from './StringInputStream';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream, LiteralInputStream, BlockInputStream, MultilineCommentStream } from './decorators';

describe('class TillEndOfLIneStream', () => {
    test('isEof() reads to the end of the line', () => {
        expect(readToEnd(new TillEndOfLineStream(new StringInputStream("line number 1.\n.line number 2\n\nend of the stream")))).toEqual('line number 1.');
    });
});

describe('class KindOfSpaceInputStream', () => {
    test('->isKindOfSpace()', () => {
        expect(KindOfSpaceInputStream.isKindOfSpace(' ')).toBeTruthy();
        expect(KindOfSpaceInputStream.isKindOfSpace('x')).toBeFalsy();
        expect(KindOfSpaceInputStream.isKindOfSpace('.')).toBeFalsy();
    });

    test('isEof() reads to the end of the space sequence', () => {
        expect(readToEnd(new KindOfSpaceInputStream(new StringInputStream("  \n\r end")))).toEqual("  \n\r ");
    });
});

describe('class LiteralInputStream', () => {
    test('->isLiteral()', () => {
        expect(LiteralInputStream.isLiteral('.')).toBeFalsy();
        expect(LiteralInputStream.isLiteral('#')).toBeFalsy();
        expect(LiteralInputStream.isLiteral('f')).toBeTruthy();
        expect(LiteralInputStream.isLiteral('_')).toBeTruthy();
        expect(LiteralInputStream.isLiteral('1')).toBeTruthy();
        expect(LiteralInputStream.isLiteral(' ')).toBeFalsy();
    });

    test('reads to the end of the literal', () => {
        expect(readToEnd(new LiteralInputStream(new StringInputStream('className .nextClassName')))).toEqual('className');
        expect(readToEnd(new LiteralInputStream(new StringInputStream('className, .nextClassName')))).toEqual('className');
        expect(readToEnd(new LiteralInputStream(new StringInputStream('className, .nextClassName')))).toEqual('className');
        expect(readToEnd(new LiteralInputStream(new StringInputStream('className:hover, .nextClassName')))).toEqual('className');
    });
});

describe('class BlockInputStream', () => {
    test('one level block', () => {
        const input = new BlockInputStream(new StringInputStream(`{
            display: block;
        } blah blah`));
        expect(readToEnd(input)).toEqual(`{
            display: block;
        }`);
    });
});

describe('class MultilineCommentStream', () => {
    test('correct multiline comment', () => {
        const input = new MultilineCommentStream(new StringInputStream(" test of multiline comment, \n **test / */ end"));
        expect(readToEnd(input)).toEqual(" test of multiline comment, \n **test / ");
    });

    test('some tricy cases', () => {
        expect(readToEnd(
            new MultilineCommentStream(new StringInputStream("** /* \n */"))
        )).toEqual("** /* \n ");
    });

    test('the end of the file', () => {
        expect(readToEnd(
            new MultilineCommentStream(new StringInputStream("test \n\n test"))
        )).toEqual("test \n\n test");
    });
});
