import { StringInputStream } from './StringInputStream';
import { readToEnd, TillEndOfLineStream, KindOfSpaceInputStream } from './decorators';

describe('TillEdnOfLIneStream', () => {
    test('isEof() reads to the end of the line', () => {
        expect(readToEnd(new TillEndOfLineStream(new StringInputStream("line number 1\nline number 2\n\nend of the stream")))).toEqual('line number 1');
    });
});

describe('KindOfSpaceInputStream', () => {
    test('isEof() reads to the end of the space sequence', () => {
        expect(readToEnd(new KindOfSpaceInputStream(new StringInputStream("  \n\r end")))).toEqual("  \n\r ");
    });
});
