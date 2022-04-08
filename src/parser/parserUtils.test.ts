import { Keywords } from "keywords";
import { StringInputStream } from "stream/input";
import { Symbols } from "symbols";
import { lexer } from "./lexer";
import { commaList, firstOf, keyword, longestOf, oneOfSymbols, optional, sequence, symbol } from "./parserUtils";
import { ArrayTokenStream, TokenStream } from "./tokenStream";

describe('parserUtils', () => {
    it('keyword', () => {
        const tokens = lexer(new StringInputStream(`var`))
        const node = keyword(Keywords._var)(new ArrayTokenStream(tokens));
        expect(node).toEqual('var');
    });

    describe('commaList()', () => {
        it('correct simple rule', () => {
            const tokens = lexer(new StringInputStream(`var, var , var var`))
            const node = commaList(keyword(Keywords._var))(new ArrayTokenStream(tokens));
            expect(node).toEqual(['var', 'var', 'var']);
        });

        it('complex rule', () => {
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

        it('invalid simple rule', () => {
            const tokens = lexer(new StringInputStream(`xvar, var  var`))
            expect(() => {
                commaList(keyword(Keywords._var))(new ArrayTokenStream(tokens));
            }).toThrowError("list of elements is exptected");
        });

        it('interapted in the middle', () => {
            const tokens = lexer(new StringInputStream(`var, xvar, var`))
            const stream = new ArrayTokenStream(tokens);
            const node = commaList(keyword(Keywords._var))(stream);
            expect(node).toEqual(['var']);
            expect(stream.currentPosition()).toEqual(2)
        });
    });

    describe('firstOf()', () => {
        it('correct simple rules', () => {
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

        it('none of rules is matched', () => {
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
        it('correct simple rules', () => {
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

        it('longest sequence', () => {
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

        it('recursive sequence', () => {
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

        it('none of rules is matched', () => {
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
        it('value is present', () => {
            const tokens = lexer(new StringInputStream(`var`))
            const stream = new ArrayTokenStream(tokens);
            const node = optional(keyword(Keywords._var))(stream);
            expect(node).toEqual('var');
            expect(stream.currentPosition()).toEqual(1);
        });

        it('value is not present', () => {
            const tokens = lexer(new StringInputStream(`no var`))
            const stream = new ArrayTokenStream(tokens);
            const node = optional(keyword(Keywords._var))(stream);
            expect(node).toBeUndefined();
            expect(stream.currentPosition()).toEqual(0);
        });
    });

    describe('sequence()', () => {
        it('correct sequence', () => {
            const tokens = lexer(new StringInputStream(`var if const no`))
            const stream = new ArrayTokenStream(tokens);
            const node = sequence(keyword(Keywords._var), keyword(Keywords._if), keyword(Keywords._const))(stream);
            expect(node).toEqual(['var', 'if', 'const']);
            expect(stream.currentPosition()).toEqual(5);
        });

        it('invalid sequence', () => {
            const tokens = lexer(new StringInputStream(`var no if const`))
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                sequence(keyword(Keywords._var), keyword(Keywords._if), keyword(Keywords._const))(stream);
            }).toThrowError("keyword if is expected, but {\"type\":5,\"value\":\"no\"} was given");
            expect(stream.currentPosition()).toEqual(0);
        });
    });

    it('symbol()', () => {
        const tokens = lexer(new StringInputStream(`**`))
        const stream = new ArrayTokenStream(tokens);
        const node = symbol(Symbols.astersik2)(stream);
        expect(node).toEqual('**');
        expect(stream.currentPosition()).toEqual(1);
    });

    it('oneOfSymbols()', () => {
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
