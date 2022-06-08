import { Keyword, Keywords } from "keywords";
import { StringInputStream } from "stream/input";
import { Symbols } from "symbols";
import { TokenType } from "token";
import { lexer } from "./lexer";
import { BlockParserError, ParserError } from "./parserError";
import { anyLiteral, block, commaList, firstOf, ignoreSpacesAndComments, keyword, longestOf, map, noLineTerminatorHere, noSpacesHere, oneOfSymbols, optional, sequence, symbol } from "./parserUtils";
import { BlockType, NodeType } from "./syntaxTree";
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
            }).toThrowError("(1:1) : list of elements is expected");
        });

        it('interapted in the middle', () => {
            const tokens = lexer(new StringInputStream(`var, xvar, var`))
            const stream = new ArrayTokenStream(tokens);
            const node = commaList(keyword(Keywords._var))(stream);
            expect(node).toEqual(['var']);
            expect(stream.currentPosition()).toEqual(2)
        });

        it('can be empty', () => {
            const stream = new ArrayTokenStream([]);
            const node = commaList(anyLiteral, true)(stream);
            expect(node).toEqual([]);
            expect(stream.currentPosition()).toEqual(0)
        });

        it('cannot be empty', () => {
            const stream = new ArrayTokenStream([], {line: 10, col: 10});
            expect(() => {
               commaList(anyLiteral, false)(stream);
            }).toThrowError('(10:10) : list of elements is expected')
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
            }).toThrowError('(1:1) : unknown statement "instanceof"');
            expect(stream.currentPosition()).toEqual(0);
        });

        it('block rule and BlockParserError', () => {
            const tokens = lexer(new StringInputStream(`instanceof`))
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                firstOf(
                    keyword(Keywords._if),
                    keyword(Keywords._async),
                    keyword(Keywords._var),
                    sequence(
                        keyword(new Keyword('url')),
                        noSpacesHere,
                        function(stream : TokenStream) {
                            throw new BlockParserError(new ParserError('some error in the block', stream.peek()));
                        }
                    )
                )(stream);
            }).toThrowError('(1:1) : unknown statement "instanceof"');
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
            }).toThrowError('(1:1) : none of the parsers worked');
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
            }).toThrowError(`(1:5) : keyword "if" is expected`);
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

    describe('noLineTerminatorHere()', () => {
        it('noLineTerminatorHere() without spaces', () => {
            const tokens = lexer(new StringInputStream(`i++`))
            const stream = new ArrayTokenStream(tokens);

            const literal = anyLiteral(stream);
            expect(literal).toEqual('i');
            noLineTerminatorHere(stream);
            const node = symbol(Symbols.plus2)(stream);
            expect(node).toEqual('++');
        });

        it('noLineTerminatorHere() with spaces', () => {
            const tokens = lexer(new StringInputStream(`i  ++`))
            const stream = new ArrayTokenStream(tokens);

            const literal = anyLiteral(stream);
            expect(literal).toEqual('i');
            noLineTerminatorHere(stream);
            const node = symbol(Symbols.plus2)(stream);
            expect(node).toEqual('++');
        });

        it('noLineTerminatorHere() with lineTerminator', () => {
            const tokens = lexer(new StringInputStream(`i \n ++`))
            const stream = new ArrayTokenStream(tokens);

            const literal = anyLiteral(stream);
            expect(literal).toEqual('i');
            expect(() => {
                noLineTerminatorHere(stream);
            }).toThrowError();
        });
    });

    describe('block()', () => {
        it('parses block with simple content', () => {
            const tokens = lexer(new StringInputStream(`(1,2,3,4)`))
            const stream = new ArrayTokenStream(tokens);

            const node = block(
                TokenType.RoundBrackets,
                commaList(anyLiteral)
            )(stream);

            expect(node.type).toEqual(NodeType.Block);
            expect(node.blockType).toEqual(BlockType.RoundBracket);
            expect(node.items).toEqual(["1", "2", "3", "4"]);
        });

        it('parses curly bracket block', () => {
            const tokens = lexer(new StringInputStream(`{1,2,3,4}`))
            const stream = new ArrayTokenStream(tokens);

            const node = block(
                TokenType.LazyBlock,
                commaList(anyLiteral)
            )(stream);

            expect(node.type).toEqual(NodeType.Block);
            expect(node.blockType).toEqual(BlockType.CurlyBracket);
            expect(node.items).toEqual(["1", "2", "3", "4"]);
        });

        it('empty block', () => {
            const tokens = lexer(new StringInputStream(`[]`))
            const stream = new ArrayTokenStream(tokens);

            const node = block(
                TokenType.SquareBrackets,
                commaList(anyLiteral, true)
            )(stream);

            expect(node.type).toEqual(NodeType.Block);
            expect(node.blockType).toEqual(BlockType.SquareBracket);
            expect(node.items).toEqual([]);
        });

        it('wrong block type', () => {
            const tokens = lexer(new StringInputStream(`[hi]`));
            const stream = new ArrayTokenStream(tokens);

            expect(() => {
                block(
                    TokenType.RoundBrackets,
                    commaList(anyLiteral, true)
                )(stream);
            }).toThrowError('(1:1) : block is expected');
        });

        it('wrong block content', () => {
            const tokens = lexer(new StringInputStream(`[###]`));
            const stream = new ArrayTokenStream(tokens);

            expect(() => {
                block(
                    TokenType.SquareBrackets,
                    commaList(anyLiteral, true)
                )(stream);
            }).toThrowError('(1:2) : unexpected token " ### "');
        });

    });

    describe('ignoreSpacesAndComments()', () => {
        it('spaces and comments', () => {
            const tokens = lexer(new StringInputStream(`  \n /* test */no!`));
            const stream = new ArrayTokenStream(tokens);
            const node = ignoreSpacesAndComments(stream);

            expect(node.type).toEqual(NodeType.Ignore);
            expect(node.items).toEqual([
                "  \n ",
                "/* test */"
            ]);
        });

        it('html comment', () => {
            const tokens = lexer(new StringInputStream(`  \n <!-- test -->no`));
            const stream = new ArrayTokenStream(tokens);
            const node = ignoreSpacesAndComments(stream);

            expect(node.type).toEqual(NodeType.Ignore);
            expect(stream.currentPosition()).toEqual(2);
            expect(stream.peek()).toEqual({
                position: expect.anything(),
                type: TokenType.Literal,
                value: "no"
            });
            expect(node.items).toEqual([
                "  \n ",
                "<!-- test -->"
            ]);
        });

        it('nor space, neither a comment', () => {
            const tokens = lexer(new StringInputStream(`no`));
            const stream = new ArrayTokenStream(tokens);
            expect(() => {
                ignoreSpacesAndComments(stream);
            }).toThrowError('(1:1) : Comment or space symbols are expected');
        });

        it('empty stream', () => {
            const stream = new ArrayTokenStream([]);
            expect(() => {
                ignoreSpacesAndComments(stream);
            }).toThrowError('(0:0) : Unexpected end of the stream');
        });

    });

    describe('map()', () => {
        const tokens = lexer(new StringInputStream(`var test`))
        const stream = new ArrayTokenStream(tokens);
        const value = map(sequence(
            keyword(Keywords._var),
            anyLiteral,
        ), item => item.join('+'))(stream);
        expect(value).toEqual('var+test');
    });

    describe('class BlockParserError', () => {
        it('instanceof', () => {
            const parserError = new ParserError('error!', {
                type: TokenType.Comment,
                value: 'test token',
                position: {
                    line: 1,
                    col: 5,
                }
            });
            const blockError = new BlockParserError(parserError);

            expect(parserError instanceof ParserError).toBeTruthy();
            expect(blockError instanceof BlockParserError).toBeTruthy();
            expect(blockError instanceof Error).toBeTruthy();
        });

    });

});
