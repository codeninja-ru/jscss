import { jssLexer } from "lexer/jssLexer";
import { StringInputStream } from "stream/input";
import { Position } from "stream/position";
import { TokenType } from "token";
import { exportDeclaration, importDeclaration, parseJsModule, parseJsScript, parseJsStatement, parseJsVarStatement } from "./parser";
import { returnRawNode } from "./parserUtils";
import { NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { ArrayTokenStream, LookAheadTokenStream } from "./tokenStream";

function testParserFunction<R>(fn : TokenParser<R>, script : string) : R {
    const tokens = jssLexer(new StringInputStream(script))
    const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
    const node = fn(stream);
    expect(stream.sourceFragment().value).toEqual(script);

    return node;
}

describe('parsers', () => {
    it('import parsing', () => {
        testParserFunction(parseJsModule, "import _ from 'lodash';");
        testParserFunction(parseJsModule, "import _ from 'lodash'");
    });

    it('parseJsImport()', () => {
        testParserFunction(parseJsModule, `import * as test from 'somelib';`);
    });

    describe('parseJsVarStatement()', () => {
        it('simple', () => {
            const tokens = jssLexer(new StringInputStream(`const a = 1;`))
            const stream = new ArrayTokenStream(tokens);
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: "a"}
            ]});
            expect(stream.currentPosition()).toEqual(8);
        });

        it('function', () => {
            const tokens = jssLexer(new StringInputStream(`let fn = function(test) {};`))
            const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: "fn"}
            ]});
            expect(stream.sourceFragment().value).toEqual('let fn = function(test) {};');
            expect(stream.currentPosition()).toEqual(11);
        });

        it('destracting', () => {
            const tokens = jssLexer(new StringInputStream(`let {a, b} = fn(kek)[1].test`))
            const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {name: {type: NodeType.Lazy, value: "{a, b}"}, type: NodeType.VarDeclaration}
            ]});
            expect(stream.sourceFragment().value).toEqual('let {a, b} = fn(kek)[1].test');
            expect(stream.currentPosition()).toEqual(11);
        });

        it('multilple assignment', () => {
            const tokens = jssLexer(new StringInputStream(`var t1 = 1, t2 = .2, t3 = 3;`))
            const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node).toEqual({"type": NodeType.VarStatement, items: [
                {type: NodeType.VarDeclaration, name: 't1'},
                {type: NodeType.VarDeclaration, name: 't2'},
                {type: NodeType.VarDeclaration, name: 't3'},
            ]});
            expect(stream.sourceFragment().value).toEqual('var t1 = 1, t2 = .2, t3 = 3;');
            expect(stream.currentPosition()).toEqual(23);
        });

        it('arrow function', () => {
            const tokens = jssLexer(new StringInputStream(`let fn = (test) => {};`))
            const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
            const node = parseJsVarStatement(stream);
            expect(node.type).toEqual(NodeType.VarStatement);
            expect(stream.sourceFragment().value).toEqual('let fn = (test) => {};');
            expect(stream.currentPosition()).toEqual(13);
        });
    });
});

describe('parseJsStatement', () => {
    it('for loop', () => {
        const script = `
for (var i = 0; i < 10; i++) {
   chopok(i);
}`;
        const tokens = jssLexer(new StringInputStream(script))
        const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
        const node = returnRawNode(parseJsStatement)(stream);
        expect(stream.sourceFragment().value).toEqual(script);
        expect(node).toEqual({"type": NodeType.Raw, value: script, position: {line: 1, col: 1}});
    });

    it('console.log()', () => {
        const script = `console.log(1)`;
        const node = testParserFunction(returnRawNode(parseJsStatement), script);
        expect(node).toEqual({type: NodeType.Raw, value: script, position: {line: 1, col: 1}});
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
        testParserFunction(parseJsScript, 'if (1) {} else {};');
        testParserFunction(parseJsScript, 'if (1) {};');
        testParserFunction(parseJsScript, 'if (1) alert(1);');
        testParserFunction(parseJsScript, 'if (1) {} else if (2) {}');
    });

    it('parse a simple expression', () => {
        const script = `alert(1);`;
        const tokens = jssLexer(new StringInputStream(script))
        const stream = new LookAheadTokenStream(new ArrayTokenStream(tokens));
        const node = parseJsScript(stream);
        expect(stream.sourceFragment().value).toEqual(script);
        expect(node.type).toEqual(NodeType.JsScript);
    });

    it('conditional expressions', () => {
        testParserFunction(parseJsScript, "var x = isTrue() ? 1 : 2;");
        testParserFunction(parseJsScript, "var x = a == b ? 1 : 2");
        testParserFunction(parseJsScript, "var x = a(1) == b[2] ? 1 : 2");
        testParserFunction(parseJsScript, "var x = a(1) == b[2] ? 1 : c.test");
        testParserFunction(parseJsScript, "x = a == b ? 1 : 2");
    });

    it('regexps', () => {
        testParserFunction(parseJsScript, "var a = /(.)*[a-z]/gi;");
        testParserFunction(parseJsScript, "/(.)*[a-z]/;");
        testParserFunction(parseJsScript, /\/\/\/\\*[a-z]\\/gi.toString());
        testParserFunction(parseJsScript, 'rcleanScript = /^\s*<!\[CDATA\[|\]\]>\s*$/g;');
        expect(() => parseJsScript(ArrayTokenStream.fromString('/'))).toThrowError('(1:1) : unexpected end');
    });

    it('string', () => {
        testParserFunction(parseJsScript, "var a = 'test';");
        testParserFunction(parseJsScript, "var a = 'test \\n test';");
        testParserFunction(parseJsScript, 'var a = "test";');
        testParserFunction(parseJsScript, 'var a = "test \\n test";');
        testParserFunction(parseJsScript, 'a = `test \n test`;');
        testParserFunction(parseJsScript, 'a = `test \n test ${a + b}`;');
    });

    it('expressions', () => {
        testParserFunction(parseJsScript, "var i = 2 + 1 * 10 ^ 2;");
        testParserFunction(parseJsScript, "var fn = (i) => { alert(i) }");
        testParserFunction(parseJsScript, "var fn = i => { alert(i) }");
        testParserFunction(parseJsScript, "const fn = .2 + 1.2 - 0.2");
        testParserFunction(parseJsScript, "let fn = a[1].test && c.test || b(args)");
        testParserFunction(parseJsScript, "var fn = a << b & c[1](2)");
        testParserFunction(parseJsScript, "i--");
        testParserFunction(parseJsScript, "i++;");
        testParserFunction(parseJsScript, "i++");
        testParserFunction(parseJsScript, "--i");
        testParserFunction(parseJsScript, "--i;");
        testParserFunction(parseJsScript, "--i + foo");
    });

    it('parses IIFE pattern', () => {
        testParserFunction(parseJsScript, `(function (TokenType) {
    TokenType[TokenType["Space"] = 0] = "Space";
})(TokenType || (TokenType = {}));`);
    });

    it('parses imports', () => {
        expect(testParserFunction(importDeclaration, `import _ from 'lodash';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lodash'",
                      pathPos: new Position(1, 15),
                      vars: [{
                          name: undefined,
                          moduleExportName: {value: "_",
                                             position: new Position(1, 8),
                                             type: TokenType.Literal},
                      }]});
        expect(testParserFunction(importDeclaration, `import {  } from 'lodash';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lodash'",
                      pathPos: new Position(1, 18),
                      vars: []});
        expect(testParserFunction(importDeclaration, `import {} from 'lodash';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lodash'",
                      pathPos: new Position(1, 16),
                      vars: []});
        expect(testParserFunction(importDeclaration, `import './lib.js';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'./lib.js'",
                      pathPos: new Position(1, 8),
                      vars: []});
        expect(testParserFunction(importDeclaration, `import * as lib from 'lib';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lib'",
                      pathPos: new Position(1, 22),
                      vars: [{
                          name: {value: "*",
                                 position: new Position(1, 8),
                                 type: TokenType.Literal},
                          moduleExportName: {value: 'lib',
                                             position: new Position(1, 13),
                                             type: TokenType.Literal}
                      }]});
        expect(testParserFunction(importDeclaration, `import {name1, name2} from "module";`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: '"module"',
                      pathPos: new Position(1, 28),
                      vars: [{
                          name: {value: "name1",
                                 position: new Position(1, 9),
                                 type: TokenType.Literal},
                          moduleExportName: undefined,
                      }, {
                          name: {value: "name2",
                                 position: new Position(1, 16),
                                 type: TokenType.Literal},
                          moduleExportName: undefined,
                      }]});
        expect(testParserFunction(importDeclaration, `import { name1,/* comment */ name2 } from "module";`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: '"module"',
                      pathPos: new Position(1, 43),
                      vars: [{
                          name: {value: "name1",
                                 position: new Position(1, 10),
                                 type: TokenType.Literal},
                          moduleExportName: undefined,
                      }, {
                          name: {value: "name2",
                                 position: new Position(1, 19),
                                 type: TokenType.Literal},
                          moduleExportName: undefined,
                      }]});
        expect(testParserFunction(importDeclaration, `import {test, y as y1, 'z' as z1} from 'lib';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lib'",
                      pathPos: new Position(1, 40),
                      vars: [{
                          name: {value: "test",
                                 position: new Position(1, 9),
                                 type: TokenType.Literal},
                          moduleExportName: undefined,
                      }, {
                          name: {value: "y",
                                 position: new Position(1, 15),
                                 type: TokenType.Literal},
                          moduleExportName: {value: "y1",
                                             position: new Position(1, 20),
                                             type: TokenType.Literal},
                      }, {
                          name: {value: "'z'",
                                 position: new Position(1, 24),
                                 type: TokenType.Literal},
                          moduleExportName: {value: "z1",
                                             position: new Position(1, 31),
                                             type: TokenType.Literal},
                      }]});
        expect(testParserFunction(importDeclaration, `import z, {y as y1, 'z' as z1} from 'lib';`))
            .toEqual({type: NodeType.ImportDeclaration,
                      path: "'lib'",
                      pathPos: new Position(1, 37),
                      vars: [{
                          name: {value: "*",
                                 position: new Position(1, 8),
                                 type: TokenType.Literal},
                          moduleExportName: {value: "z",
                                             position: new Position(1, 8),
                                             type: TokenType.Literal},
                      }, {
                          name: {value: "y",
                                 position: new Position(1, 12),
                                 type: TokenType.Literal},
                          moduleExportName: {value: "y1",
                                             position: new Position(1, 17),
                                             type: TokenType.Literal},
                      }, {
                          name: {value: "'z'",
                                 position: new Position(1, 21),
                                 type: TokenType.Literal},
                          moduleExportName: {value: "z1",
                                             position: new Position(1, 28),
                                             type: TokenType.Literal},
                      }]});
    });

});

describe('parseJsModule()', () => {
    it('simple module', () => {
        testParserFunction(parseJsModule, `import 'test';
import * as a1 from "module";
import _ from 'lodash';
import {name1, name2} from "module";
export function func() {};
export const varName = name1;
export default class {};`);
    });

    it('parses an objectBinding in the lazy way', () => {
        const node1 = testParserFunction(exportDeclaration, `export const {a1} = {a1:1};`);
        expect(node1.type).toEqual(NodeType.ExportDeclaration);
        expect(node1.value.type).toEqual(NodeType.VarDeclaration);
        expect(node1.value).toEqual('todo');
    });

});
