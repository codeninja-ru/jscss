import { StringInputStream } from "stream/input";
import { parseCssStyleSheet, rulesetStatement, selector, simpleSelector } from "./cssParser";
import { lexer } from "./lexer";
import { TokenParser } from "./tokenParser";
import { ArrayTokenStream, GoAheadTokenStream } from "./tokenStream";

const SAMPLE = `
@charset 'utf-8';
@import 'styles.css';

div {
  color: #777 !important;
}

.className > div#id#name[attr=value]:href, a:href {
  color: white;
  background: #fff; // comment
}

.className + div#id#name[attr=value]:href, a:href {
  color: white;
  background: #fff; /* comment */
}

<!-- comment -->

@media screen, print {
    div {
        color: #888 !important;
    }
}`;

function testParser(fn : TokenParser, str : string) {
    const tokens = lexer(new StringInputStream(str));
    const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));

    fn(stream);
    expect(stream.rawValue()).toEqual(str);
}

describe('CSS Parser', () => {
    it('parse simple css', () => {
        const tokens = lexer(new StringInputStream(SAMPLE));
        const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));

        parseCssStyleSheet(stream);
        expect(stream.rawValue()).toEqual(SAMPLE);
    });

    it('simpleSelector', () => {
        testParser(simpleSelector, '*');
        testParser(simpleSelector, 'div');
        testParser(simpleSelector, 'div.className');
        testParser(simpleSelector, '.className');
        testParser(simpleSelector, 'a:href');
        testParser(simpleSelector, '*');
        testParser(simpleSelector, 'input[type=edit]');
    });

    it('selector', () => {
        testParser(selector, 'div');
        testParser(selector, 'div > .className');
        testParser(selector, 'div + .className');
        testParser(selector, 'div .className');
        testParser(selector, '.className > div#id#name[attr=value]:href');
    });

    test('rulesetStatement', () => {
        testParser(rulesetStatement, 'div {}');
        testParser(rulesetStatement, 'div { color: white; }');
    });

});
