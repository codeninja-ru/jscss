import { StringInputStream } from "stream/input";
import { parseStream } from "./Parser";

const SIMPLE_CSS = `
// this is a comment

.className {
    ...classNameBase.prop;
    [generateProp]: bold;
    font-weight: $\{test ? 'bold' : 'normal'\};
    font-size: 12px;
    color: $\{color("#eee")\};
    background: $\{func()\};
}
`;

const SIMPLE_JS = `
import _ from 'lodash';
import {foo} from 'bar';

function process(css) {
    return _(css).map((val) => val + 1);
}

.className {
    color: #eee;
    foo: $\{foo\};
}
`;


describe('Parser()', () => {
    test('simple css', () => {
        const tokens = parseStream(new StringInputStream(SIMPLE_CSS));
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

    test('that javascript is ignored', () => {
        const tokens = parseStream(new StringInputStream(SIMPLE_JS));
        expect(tokens).toEqual([
        ]);
    });

});