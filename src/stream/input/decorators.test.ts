import { StringInputStream } from './StringInputStream';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream, LiteralInputStream } from './decorators';

describe('class TillEndOfLIneStream', () => {
    test('isEof() reads to the end of the line', () => {
        expect(readToEnd(new TillEndOfLineStream(new StringInputStream("line number 1\nline number 2\n\nend of the stream")))).toEqual('line number 1');
    });
});

describe('class KindOfSpaceInputStream', () => {
    test('->isKindOfSpace()', () => {
        expect(KindOfSpaceInputStream.isKindOfSpace(' ')).toBeTruthy();
        expect(KindOfSpaceInputStream.isKindOfSpace('x')).toBeFalsy();
    });

    test('isEof() reads to the end of the space sequence', () => {
        expect(readToEnd(new KindOfSpaceInputStream(new StringInputStream("  \n\r end")))).toEqual("  \n\r ");
    });
});

describe('class LiteralInputStream', () => {
    test('->isLiteral()', () => {
        expect(LiteralInputStream.isLiteral('.')).toBeTruthy();
        expect(LiteralInputStream.isLiteral('f')).toBeTruthy();
        expect(LiteralInputStream.isLiteral('1')).toBeTruthy();
        expect(LiteralInputStream.isLiteral(' ')).toBeFalsy();
    });

    test('reads to the end of the literal', () => {
        expect(readToEnd(new LiteralInputStream(new StringInputStream('.className .nextClassName')))).toEqual('.className');
    });
});
