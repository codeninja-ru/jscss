import { Keywords } from "keywords";
import { StringInputStream } from "stream/input";
import { Symbols } from "symbols";
import { makeLiteralToken, makeSpaceToken, makeStringToken } from "token/helpers";
import { lexer } from "./lexer";
import { ArrayTokenStream, commaList, CommonChildTokenStream, firstOf, keyword, longestOf, oneOfSymbols, optional, parse, parseCssBlock, parseCssImport, parseJsImport, parseJsScript, parseJsStatement, parseJsVarStatement, sequence, symbol, TokenParser, TokenStream } from "./parser1";
import { Node, NodeType } from "./syntaxTree";

function testParserFunction(fn : TokenParser , script : string) : Node {
    const tokens = lexer(new StringInputStream(script))
    const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
    const node = fn(stream);
    expect(stream.rawValue()).toEqual(script);

    return node;
}

describe('parser', () => {
    it('import parsing', () => {
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
    it('parseJsImport()', () => {
        const tokens = lexer(new StringInputStream(`import * as test from 'somelib';`))

        const node = parseJsImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'somelib'", "type": NodeType.JsImport, "vars": [{"varAlias": "test", "varName": "*"}]});
    });

    it('parseCssBlock()', () => {
        const tokens = lexer(new StringInputStream(`a:hover, #id.class div, .class1 > .class2, input[type=button] { color: #555; }`));

        const node = parseCssBlock(new ArrayTokenStream(tokens));
        expect(node).toEqual({"block": {
            type: NodeType.Lazy,
            value: "{ color: #555; }",
        }, "selectors": ["a:hover", "#id.class div", ".class1 > .class2", "input[type=button]"], "type": NodeType.CssBlock});
    });

    it('parseCssImport()', () => {
        const tokens = lexer(new StringInputStream(`@import 'style.css';`));

        const node = parseCssImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'style.css'", "type": NodeType.CssImport});
    });

    describe('parseJsVarStatement()', () => {
        it('simple', () => {
            const tokens = lexer(new StringInputStream(`const a = 1;`))
            const stream = new ArrayTokenStream(tokens);
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: "a"}
            ]});
            expect(stream.currentPosition()).toEqual(8);
        });

        it('function', () => {
            const tokens = lexer(new StringInputStream(`let fn = function(test) {};`))
            const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: "fn"}
            ]});
            expect(stream.rawValue()).toEqual('let fn = function(test) {};');
            expect(stream.currentPosition()).toEqual(11);
        });

        it('destracting', () => {
            const tokens = lexer(new StringInputStream(`let {a, b} = fn(kek)[1].test`))
            const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {name: {type: NodeType.Lazy, value: "{a, b}"}, type: NodeType.VarDeclaration}
            ]});
            expect(stream.rawValue()).toEqual('let {a, b} = fn(kek)[1].test');
            expect(stream.currentPosition()).toEqual(11);
        });

        it('multilple assignment', () => {
            const tokens = lexer(new StringInputStream(`var t1 = 1, t2 = .2, t3 = 3;`))
            const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: 't1'},
                {type: NodeType.VarDeclaration, name: 't2'},
                {type: NodeType.VarDeclaration, name: 't3'},
            ]});
            expect(stream.rawValue()).toEqual('var t1 = 1, t2 = .2, t3 = 3;');
            expect(stream.currentPosition()).toEqual(23);
        });

        it('arrow function', () => {
            const tokens = lexer(new StringInputStream(`let fn = (test) => {};`))
            const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node.type).toEqual(NodeType.VarStatement);
            expect(stream.rawValue()).toEqual('let fn = (test) => {};');
            expect(stream.currentPosition()).toEqual(12);
        });
    });
});

describe('parseJsStatement', () => {
    it('for loop', () => {
        const script = `
for (var i = 0; i < 10; i++) {
   chopok(i);
}`;
        const tokens = lexer(new StringInputStream(script))
        const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
        const node = parseJsStatement(stream);
        expect(stream.rawValue()).toEqual(script);
        expect(node).toEqual({"type": NodeType.JsStatement});
    });

    it('console.log()', () => {
        const script = `console.log(1)`;
        const node = testParserFunction(parseJsStatement, script);
        expect(node.type).toEqual(NodeType.JsStatement);
    });

});

describe('parseJsScript()', () => {
    it('simple js script', () => {
        const script = `for (var i = 0; i < 10; i++) {
   chopok(i);
console.log('hi');
} function it(t) { alert(t); } if (1) alert(1); else alert(2);`;
        const node = testParserFunction(parseJsScript, script);
        expect(node.type).toEqual(NodeType.JsScript);
    });

    it('if statement', () => {
        const node = testParserFunction(parseJsScript, 'if (1) alert(1); else alert(2);');
        expect(node.type).toEqual(NodeType.JsScript);
    });

    it('parse a simple expression', () => {
        const script = `alert(1);`;
        const tokens = lexer(new StringInputStream(script))
        const stream = new CommonChildTokenStream(new ArrayTokenStream(tokens));
        const node = parseJsScript(stream);
        expect(stream.rawValue()).toEqual(script);
        expect(node.type).toEqual(NodeType.JsScript);
    });

});

//TODO move parseUtils to a seprate file
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
