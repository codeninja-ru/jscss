import { StringInputStream } from "stream/input";
import { cssLiteral, declaration, parseCssStyleSheet, rulesetStatement, selector, simpleSelector } from "./cssParser";
import { jssLexer } from "lexer/jssLexer";
import { CssBlockItemNode, CssBlockNode, CssSelectorNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { ArrayTokenStream, LookAheadTokenStream } from "./tokenStream";

const SAMPLE = `
@charset 'utf-8';
@import 'styles.css';

div {
  color: #777 !important;
}

.className > div#id#name[attr=value]:href, a:href {
  color: white;
  background-color: #fff; // comment
}

.className + div#id#name[attr=value]:href, a:href {
  color: white;
  background-color: #fff; /* comment */
}

<!-- comment -->

@media screen, print {
    div {
        color: #888 !important;
    }
}`;

function testParser(fn : TokenParser, str : string) : any {
    const tokens = jssLexer(new StringInputStream(str));
    const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));

    const result = fn(stream);
    expect(stream.sourceFragment().value).toEqual(str);

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

function cssBlock(selectors : CssSelectorNode[], blockItems : CssBlockItemNode[]) : CssBlockNode {
    return {type: NodeType.CssBlock, selectors: selectors, items: blockItems};
}

describe('CSS Parser', () => {
    it('parse simple css', () => {
        const tokens = jssLexer(new StringInputStream(SAMPLE));
        const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));

        const result = parseCssStyleSheet(stream);
        expect(stream.sourceFragment().value).toEqual(SAMPLE);
        expect(result).toEqual([
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssCharset, rawValue: "@charset 'utf-8';", position: { col: 1, line: 2 }},
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssImport, path: "'styles.css'", rawValue: "@import 'styles.css';", position: { col: 1, line: 3}},
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector(["div"]), [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.CssDeclaration,
                 prop: "color",
                 propPos: {line: 6, col: 3},
                 prio: "!important",
                 prioPos: {line: 6, col: 15},
                 value: '#777',
                 valuePos: {line: 6, col: 10},
                },
                {type: NodeType.Ignore, items: expect.anything()},
            ]),
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector([".className", " >", " div#id#name[attr=value]:href"], [" a:href"]), [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.CssDeclaration,
                 prop: "color",
                 propPos: {line: 10, col: 3},
                 value: 'white',
                 valuePos: {line: 10, col: 10},
                },
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.CssDeclaration,
                 prop: "background-color",
                 propPos: {line: 11, col: 3},
                 value: '#fff',
                 valuePos: {line: 11, col: 21},
                },
                {type: NodeType.Ignore, items: expect.anything()},
            ]),
            {type: NodeType.Ignore, items: expect.anything()},
            cssBlock(cssSelector([".className", " +", " div#id#name[attr=value]:href"], [" a:href"]), [
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.CssDeclaration,
                 prop: "color",
                 propPos: {line: 15, col: 3},
                 value: 'white',
                 valuePos: {line: 15, col: 10},
                },
                {type: NodeType.Ignore, items: expect.anything()},
                {type: NodeType.CssDeclaration,
                 prop: "background-color",
                 propPos: {line: 16, col: 3},
                 value: '#fff',
                 valuePos: {line: 16, col: 21},
                },
                {type: NodeType.Ignore, items: expect.anything()},
            ]),
            {type: NodeType.Ignore, items: [
                '\n\n',
                '<!-- comment -->',
                '\n\n'
            ]},
            {
                type: NodeType.CssMedia,
                mediaList: ["screen", "print"],
                position: {line: 21, col: 1},
                items: [
                    {type: NodeType.Ignore, items: expect.anything()},
                    cssBlock(cssSelector(["div"]), [
                        {type: NodeType.Ignore, items: expect.anything()},
                        {type: NodeType.CssDeclaration,
                         prop: "color",
                         propPos: {line: 23, col: 9},
                         value: '#888',
                         valuePos: {line: 23, col: 16},
                         prio: "!important",
                         prioPos: {line: 23, col: 21},
                        },
                        {type: NodeType.Ignore, items: expect.anything()},
                    ]),
                    {type: NodeType.Ignore, items: expect.anything()},
                ]
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

    it('rulesetStatement', () => {
        testParser(rulesetStatement, 'div {}');
        testParser(rulesetStatement, 'div { }');
        testParser(rulesetStatement, 'div { color: white; }');
        testParser(rulesetStatement, 'div,a {}');
        testParser(rulesetStatement, 'div::test,[test]::-test {}');
    });

    it('delcaration()', () => {
        testParser(declaration, ' color: white;');
        testParser(declaration, 'color: white;');
        testParser(declaration, 'color: white');
        testParser(declaration, 'background-image: url(/bg.jpg)');
        testParser(declaration, 'font-color: white');
        testParser(declaration, 'font-color: #fff');
        testParser(declaration, 'width: 100%');
        testParser(declaration, 'width: 10.10%');
        testParser(declaration, 'width: 0.10%');
        testParser(declaration, 'width: .10%');
        testParser(declaration, 'width: -.10%');
        testParser(declaration, 'width: -10.10%');
        testParser(declaration, 'width: 10px');
        testParser(declaration, 'width: 10em');
        testParser(declaration, 'width: -10em');
        testParser(declaration, 'width: -.10em');
        testParser(declaration, 'width: 10.0em');
        testParser(declaration, 'width: .5em');
        testParser(declaration, 'color: white !important;');
    });

    it('cssLiteral()', () => {
        expect(cssLiteral(ArrayTokenStream.fromString('test')).value).toEqual('test');
        expect(cssLiteral(ArrayTokenStream.fromString(' test')).value).toEqual('test');
        expect(cssLiteral(ArrayTokenStream.fromString('-test-name')).value).toEqual('-test-name');
        expect(cssLiteral(ArrayTokenStream.fromString('--test-name')).value).toEqual('--test-name');
        expect(cssLiteral(ArrayTokenStream.fromString('testName')).value).toEqual('testName');
        expect(cssLiteral(ArrayTokenStream.fromString('className#id')).value).toEqual('className');
        expect(() => cssLiteral(ArrayTokenStream.fromString('$testName'))).toThrowError('');
        expect(() => cssLiteral(ArrayTokenStream.fromString('   '))).toThrowError('');
        expect(() => cssLiteral(ArrayTokenStream.fromString('.className#id'))).toThrowError('');
    });

    it('parses media queries', () => {
        expect(parseCssStyleSheet(ArrayTokenStream.fromString(`@media only screen and (max-width: 600px) {
  body {
    background-color: lightblue;
  }
}`))).toEqual([{
    type: NodeType.CssMedia,
    mediaList: ["only screen and (max-width: 600px)"],
    position: {line: 1, col: 1},
    items: [
        {type: NodeType.Ignore, items: expect.anything()},
        cssBlock(cssSelector(["body"]), [
            {type: NodeType.Ignore, items: expect.anything()},
            {type: NodeType.CssDeclaration,
             prop: "background-color",
             propPos: {line: 3, col: 5},
             value: 'lightblue',
             valuePos: {line: 3, col: 23},
            },
            {type: NodeType.Ignore, items: expect.anything()},
            ]),
        {type: NodeType.Ignore, items: expect.anything()},
    ]
}]);
    });


});
