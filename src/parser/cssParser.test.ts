import { StringInputStream } from "stream/input";
import { parseCssStyleSheet, rulesetStatement, selector, simpleSelector } from "./cssParser";
import { lexer } from "./lexer";
import { BlockType, CssBlockNode, CssSelectorNode, NodeType } from "./syntaxTree";
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

function testParser(fn : TokenParser, str : string) : any {
    const tokens = lexer(new StringInputStream(str));
    const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));

    const result = fn(stream);
    expect(stream.rawValue()).toEqual(str);

    return result;
}

function cssSelector(...selectorItems : string[][]) : CssSelectorNode[] {
    return selectorItems.map(item => {
        return {
            type: NodeType.CssSelector,
            items: item,
        };
    });
}

function cssBlock(selectors : CssSelectorNode[], blockItems : any) : CssBlockNode {
    return {type: NodeType.CssBlock, selectors: selectors, block: {
        type: NodeType.Block,
        blockType: BlockType.CurlyBracket,
        items: blockItems
    }};
}

describe('CSS Parser', () => {
    it('parse simple css', () => {
        const tokens = lexer(new StringInputStream(SAMPLE));
        const stream = new GoAheadTokenStream(new ArrayTokenStream(tokens));

        const result = parseCssStyleSheet(stream);
        expect(stream.rawValue()).toEqual(SAMPLE);
        console.log(result);
        expect(result).toEqual([
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssCharset, rawValue: "@charset 'utf-8';"},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssImport, path: "'styles.css'", rawValue: "@import 'styles.css';"},
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector(["div"]), []),
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector([".className", " >", " div#id#name[attr=value]:href"], [" a:href"]), []),
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector([".className", " +", " div#id#name[attr=value]:href"], [" a:href"]), []),
            {type: NodeType.Ignore, items: [
                '\n\n',
                '<!-- comment -->',
                '\n\n'
            ]},
            {
                type: NodeType.CssMedia,
                mediaList: ["screen", "print"],
                items: {
                    type: NodeType.Block,
                    blockType: BlockType.CurlyBracket,
                    items: [
                        {type: NodeType.Ignore, items: expect.anything()},
                        cssBlock(cssSelector(["div"]), [])
                    ]
                }
            }
        ]);
    });

    it('simpleSelector', () => {
        expect(testParser(simpleSelector, '*')).toEqual("*");
        expect(testParser(simpleSelector, 'div')).toEqual('div');
        expect(testParser(simpleSelector, '.className')).toEqual('.className');
        expect(testParser(simpleSelector, ' .className')).toEqual(' .className');
        expect(testParser(simpleSelector, '.className#id')).toEqual('.className#id');
        expect(testParser(simpleSelector, 'div.className')).toEqual('div.className');
        expect(testParser(simpleSelector, '.className')).toEqual('.className');
        expect(testParser(simpleSelector, 'a:hover')).toEqual('a:hover');
        expect(testParser(simpleSelector, '*')).toEqual('*');
        expect(testParser(simpleSelector, 'input[type=edit]')).toEqual('input[type=edit]');
        expect(testParser(simpleSelector, 'input[type=edit].className')).toEqual('input[type=edit].className');
    });

    it('selector', () => {
        expect(testParser(selector, 'div')).toEqual({type: NodeType.CssSelector, items: ["div"]});
        expect(testParser(selector, 'div > .className')).toEqual({type: NodeType.CssSelector, items: ["div", " >", " .className"]});
        expect(testParser(selector, 'div + .className')).toEqual({type: NodeType.CssSelector, items: ["div", " +", " .className"]});
        expect(testParser(selector, 'div .className')).toEqual({type: NodeType.CssSelector, items: ["div", " .className"]});
        expect(testParser(selector, '.className > div#id#name[attr=items]:href')).toEqual({type: NodeType.CssSelector, items: [".className", " >", " div#id#name[attr=items]:href"]});
    });

    test('rulesetStatement', () => {
        testParser(rulesetStatement, 'div {}');
        testParser(rulesetStatement, 'div { color: white; }');
    });

});
