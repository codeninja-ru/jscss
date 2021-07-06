import { StringInputStream } from "stream/input";
import { readStream } from "./Parser";

const SIMPLE_CSS = `
// comment

.className {
    ...classNameBase;
    [generateProp]: bold;
    font-weight: test ? 'bold' : 'normal';
    font-size: 12px;
    color: color(#eee);
    background: func();
}
`;


describe('Parser()', () => {
    test('simple css', () => {
        const tokens = readStream(new StringInputStream(SIMPLE_CSS));
        expect(tokens).toEqual([
            {type: 'comment'},
            {type: 'space'},
            {type: 'literal'},
            {type: 'space'},
            {type: 'block'},
        ]);
    });
});