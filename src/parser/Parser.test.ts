import { StringInputStream } from "stream/input";
import { parseStram } from "./Parser";

const SIMPLE_CSS = `
// this is a comment

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
        const tokens = parseStram(new StringInputStream(SIMPLE_CSS));
        expect(tokens).toEqual([
            {type: 'space', value: "\n"},
            {type: 'comment', value: ' this is a comment'},
            {type: 'space', value: "\n\n"},
            {type: 'literal', value: '.className'},
            {type: 'space', value: " "},
            {type: 'lazy_block', value: `{
    ...classNameBase;
    [generateProp]: bold;
    font-weight: test ? 'bold' : 'normal';
    font-size: 12px;
    color: color(#eee);
    background: func();\n}`},
            { type: 'space', value: "\n" },
        ]);
    });
});