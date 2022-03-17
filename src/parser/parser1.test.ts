import { Keywords } from "keywords";
import { StringInputStream } from "stream/input";
import { Symbols } from "symbols";
import { makeLiteralToken, makeSpaceToken, makeStringToken } from "token/helpers";
import { lexer } from "./lexer";
import { ArrayTokenStream, commaList, firstOf, keyword, longestOf, oneOfSymbols, optional, parse, parseCssBlock, parseCssImport, parseJsImport, parseJsVarStatement, sequence, symbol, TokenStream } from "./parser1";
import { NodeType } from "./syntaxTree";

describe('parser', () => {
    test('import parsing', () => {
        const tokens = [
            makeLiteralToken('import'),
            makeSpaceToken(),
            makeLiteralToken('_'),
            makeSpaceToken(),
            makeLiteralToken('from'),
            makeSpaceToken(),
            makeStringToken('"lodash"'),
        ]; //lexer(new StringInputStream(`import _ from 'lodash';`))
        const syntaxTree = parse(new ArrayTokenStream(tokens));

        expect(syntaxTree).toEqual([
            { type: NodeType.JsImport, vars: [{ varName: '_' }], path: '"lodash"', rawValue: 'import _ from "lodash"' }
        ]);
    });
});

describe('parsers', () => {
    test('parseJsImport()', () => {
        const tokens = lexer(new StringInputStream(`import * as test from 'somelib';`))

        const node = parseJsImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'somelib'", "type": NodeType.JsImport, "vars": [{"varAlias": "test", "varName": "*"}]});
    });

    test('parseCssBlock()', () => {
        const tokens = lexer(new StringInputStream(`a:hover, #id.class div, .class1 > .class2, input[type=button] { color: #555; }`));

        const node = parseCssBlock(new ArrayTokenStream(tokens));
        expect(node).toEqual({"block": "{ color: #555; }", "selectors": ["a:hover", "#id.class div", ".class1 > .class2", "input[type=button]"], "type": NodeType.CssBlock});
    });

    test('parseCssImport()', () => {
        const tokens = lexer(new StringInputStream(`@import 'style.css';`));

        const node = parseCssImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'style.css'", "type": NodeType.CssImport});
    });

    test('parseJsVarStatement()', () => {
        const tokens = lexer(new StringInputStream(`const a = 1;`))
        const stream = new ArrayTokenStream(tokens);
        const node = parseJsVarStatement(stream);
        expect(node).toEqual({"type": NodeType.VarDeclaration});
        expect(stream.currentPosition()).toEqual(7);
    });
});

//TODO move parseUtils to a seprate file
describe('parserUtils', () => {
    test('keyword', () => {
        const tokens = lexer(new StringInputStream(`var`))
        const node = keyword(Keywords._var)(new ArrayTokenStream(tokens));
        expect(node).toEqual('var');
    });

    describe('commaList()', () => {
        test('correct simple rule', () => {
            const tokens = lexer(new StringInputStream(`var, var , var var`))
            const node = commaList(keyword(Keywords._var))(new ArrayTokenStream(tokens));
            expect(node).toEqual(['var', 'var', 'var']);
        });

        test('complex rule', () => {
            const tokens = lexer(new StringInputStream(`var if, var if async, var var`))
            const stream = new ArrayTokenStream(tokens);
            const node = commaList(
                longestOf(
                    sequence(
                        keyword(Keywords._var),
                        keyword(Keywords._if),
                    ),
                    sequence(
                        keyword(Keywords._var),
                        keyword(Keywords._if),
                        keyword(Keywords._async),
                    )
                )
            )(stream);
            expect(node).toEqual([['var', 'if'], ['var', 'if', 'async']]);
            expect(stream.currentPosition()).toEqual(11);
        });

        test('invalid simple rule', () => {
            const tokens = lexer(new StringInputStream(`xvar, var  var`))
            expect(() => {
                commaList(keyword(Keywords._var))(new ArrayTokenStream(tokens));
            }).toThrowError("list of elements is exptected");
        });

        test('interapted in the middle', () => {
            const tokens = lexer(new StringInputStream(`var, xvar, var`))
            const stream = new ArrayTokenStream(tokens);
            const node = commaList(keyword(Keywords._var))(stream);
            expect(node).toEqual(['var']);
            expect(stream.currentPosition()).toEqual(2)
        });
    });

    describe('firstOf()', () => {
        test('correct simple rules', () => {
            const tokens = lexer(new StringInputStream(`var var`))
            const stream = new ArrayTokenStream(tokens);
            const node = firstOf(
                keyword(Keywords._if),
                keyword(Keywords._async),
                keyword(Keywords._var),
            )(stream);
            expect(node).toEqual('var');
            expect(stream.currentPosition()).toEqual(1);
        });

        test('none of rules is matched', () => {
            const tokens = lexer(new StringInputStream(`instanceof`))
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                firstOf(
                    keyword(Keywords._if),
                    keyword(Keywords._async),
                    keyword(Keywords._var),
                )(stream);
            }).toThrowError('none of the parsers worked');
            expect(stream.currentPosition()).toEqual(0);
        });

    });

    describe('longestOf', () => {
        test('correct simple rules', () => {
            const tokens = lexer(new StringInputStream(`var var`))
            const stream = new ArrayTokenStream(tokens);
            const node = longestOf(
                keyword(Keywords._if),
                keyword(Keywords._async),
                keyword(Keywords._var),
            )(stream);
            expect(node).toEqual('var');
            expect(stream.currentPosition()).toEqual(1);
        });

        test('longest sequence', () => {
            const tokens = lexer(new StringInputStream(`if async var`))
            const stream = new ArrayTokenStream(tokens);
            const node = longestOf(
                keyword(Keywords._if),
                sequence(
                    keyword(Keywords._async),
                    keyword(Keywords._var),
                ),
                sequence(
                    keyword(Keywords._if),
                    keyword(Keywords._async),
                ),
                sequence(
                    keyword(Keywords._if),
                    keyword(Keywords._async),
                    keyword(Keywords._var),
                ),
            )(stream);
            expect(node).toEqual(['if', 'async', 'var']);
            expect(stream.currentPosition()).toEqual(5);
        });

        test('recursive sequence', () => {
            const tokens = lexer(new StringInputStream(`if + if + if + var`))
            const stream = new ArrayTokenStream(tokens);

            const rule1 = function(stream : TokenStream) : any {
                return longestOf(
                    keyword(Keywords._if),
                    sequence(keyword(Keywords._if), symbol(Symbols.plus), rule1)
                )(stream);
            };
            const node = longestOf(
                keyword(Keywords._var),
                keyword(Keywords._if),
                sequence(keyword(Keywords._if), symbol(Symbols.plus)),
                rule1,
            )(stream);
            expect(node).toEqual(['if', '+', ['if', '+', 'if']]);
            expect(stream.currentPosition()).toEqual(9);
        });

        test('none of rules is matched', () => {
            const tokens = lexer(new StringInputStream(`instanceof`))
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                longestOf(
                    keyword(Keywords._if),
                    keyword(Keywords._async),
                    keyword(Keywords._var),
                )(stream);
            }).toThrowError('none of the parsers worked');
            expect(stream.currentPosition()).toEqual(0);
        });
    });

    describe('optional()', () => {
        test('value is present', () => {
            const tokens = lexer(new StringInputStream(`var`))
            const stream = new ArrayTokenStream(tokens);
            const node = optional(keyword(Keywords._var))(stream);
            expect(node).toEqual('var');
            expect(stream.currentPosition()).toEqual(1);
        });

        test('value is not present', () => {
            const tokens = lexer(new StringInputStream(`no var`))
            const stream = new ArrayTokenStream(tokens);
            const node = optional(keyword(Keywords._var))(stream);
            expect(node).toBeUndefined();
            expect(stream.currentPosition()).toEqual(0);
        });
    });

    describe('sequence()', () => {
        test('correct sequence', () => {
            const tokens = lexer(new StringInputStream(`var if const no`))
            const stream = new ArrayTokenStream(tokens);
            const node = sequence(keyword(Keywords._var), keyword(Keywords._if), keyword(Keywords._const))(stream);
            expect(node).toEqual(['var', 'if', 'const']);
            expect(stream.currentPosition()).toEqual(5);
        });

        test('invalid sequence', () => {
            const tokens = lexer(new StringInputStream(`var no if const`))
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                sequence(keyword(Keywords._var), keyword(Keywords._if), keyword(Keywords._const))(stream);
            }).toThrowError("keyword if is expected, but {\"type\":5,\"value\":\"no\"} was given");
            expect(stream.currentPosition()).toEqual(0);
        });
    });

    test('symbol()', () => {
        const tokens = lexer(new StringInputStream(`**`))
        const stream = new ArrayTokenStream(tokens);
        const node = symbol(Symbols.astersik2)(stream);
        expect(node).toEqual('**');
        expect(stream.currentPosition()).toEqual(1);
    });

    test('oneOfSymbols()', () => {
        const tokens = lexer(new StringInputStream(`**`))
        const stream = new ArrayTokenStream(tokens);
        const node = oneOfSymbols(
            Symbols.astersik,
            Symbols.minus,
            Symbols.eq2and,
            Symbols.astersik2
        )(stream);
        expect(node).toEqual('**');
        expect(stream.currentPosition()).toEqual(1);
    });


});
