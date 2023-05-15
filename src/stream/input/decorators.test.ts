import { StringInputStream } from './StringInputStream';
import { readToEnd, TillEndOfLineStream, BlockInputStream, MultilineCommentStream } from './decorators';

describe('class TillEndOfLIneStream', () => {
    test('isEof() reads to the end of the line', () => {
        expect(readToEnd(new TillEndOfLineStream(new StringInputStream("line number 1.\n.line number 2\n\nend of the stream")))).toEqual('line number 1.');
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
