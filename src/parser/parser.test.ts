import { StringInputStream } from "stream/input";
import { makeLiteralToken, makeSpaceToken, makeStringToken } from "token/helpers";
import { lexer } from "./lexer";
import { parse, parseCssBlock, parseCssImport, parseJsImport, parseJsScript, parseJsStatement, parseJsVarStatement } from "./parser";
import { Node, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { ArrayTokenStream, CommonChildTokenStream } from "./tokenStream";

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
