import { StackLine, StackTrace, VmScriptStrackTrace } from "./stackTrace";

describe('StackTrace', () => {
    const STACK_TRACE = `Error: error
    at error (error1.jss:6:11)
    at JssStyleBlock.<anonymous> (error1.jss:15:28)
    at error1.jss:18:14
    at error1.jss:20:14
    at Script.runInContext (node:vm:141:12)
    at evalCode (/Users/username/projects/jscss/src/bin/eval.ts:26:23)
    at Object.<anonymous> (/Users/username/projects/jscss/src/bin/jss.ts:56:13)
    at Module._compile (node:internal/modules/cjs/loader:1126:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1180:10)
    at Module.load (node:internal/modules/cjs/loader:1004:32)`;

    it('parses valid stack string', () => {
        const trace = StackTrace.fromError({
            name: 'Error',
            message: 'error',
            stack: STACK_TRACE,
        });

        expect(trace.name).toEqual('Error');
        expect(trace.errorMessage).toEqual('error');
        expect(trace.stack[0]).toEqual({
            moduleName: "error",
            filePath: "error1.jss",
            position: {
                line: 6,
                col: 11
            }
        });
        expect(trace.stack[1]).toEqual({
            moduleName: "JssStyleBlock.<anonymous>",
            filePath: "error1.jss",
            position: {
                line: 15,
                col: 28
            }
        });
        expect(trace.stack[9]).toEqual({
            moduleName: "Module.load",
            filePath: "node:internal/modules/cjs/loader",
            position: {
                line: 1004,
                col: 32
            }
        });
    });

    it('can deal with a multiline error message', () => {
        const MESSAGE = `(20:1) : unknown statement "(function (TokenType) {
    TokenType[TokenType["Space"] = 0] = "Space";
    TokenType[TokenType["Comment"] = 1] = "Comment";
    TokenType[TokenType["MultilineComment"] = 2] = "MultilineComment";
    TokenType[TokenType["CssComment"] = 3] = "CssComment";
    TokenType[TokenType["Block"] = 4] = "Block";
    TokenType[TokenType["LazyBlock"] = 5] = "LazyBlock";
    TokenType[TokenType["Literal"] = 6] = "Literal";
    TokenType[TokenType["Comma"] = 7] = "Comma";
    TokenType[TokenType["String"] = 8] = "String";
    TokenType[TokenType["Symbol"] = 9] = "Symbol";
    TokenType[TokenType["TemplateString"] = 10] = "TemplateString";
    TokenType[TokenType["RoundBrackets"] = 11] = "RoundBrackets";
    TokenType[TokenType["SquareBrackets"] = 12] = "SquareBrackets";
})"`;
        const trace = StackTrace.fromError({
            name: 'Error',
            message: MESSAGE,
            stack: `Error: (20:1) : unknown statement "(function (TokenType) {
    TokenType[TokenType["Space"] = 0] = "Space";
    TokenType[TokenType["Comment"] = 1] = "Comment";
    TokenType[TokenType["MultilineComment"] = 2] = "MultilineComment";
    TokenType[TokenType["CssComment"] = 3] = "CssComment";
    TokenType[TokenType["Block"] = 4] = "Block";
    TokenType[TokenType["LazyBlock"] = 5] = "LazyBlock";
    TokenType[TokenType["Literal"] = 6] = "Literal";
    TokenType[TokenType["Comma"] = 7] = "Comma";
    TokenType[TokenType["String"] = 8] = "String";
    TokenType[TokenType["Symbol"] = 9] = "Symbol";
    TokenType[TokenType["TemplateString"] = 10] = "TemplateString";
    TokenType[TokenType["RoundBrackets"] = 11] = "RoundBrackets";
    TokenType[TokenType["SquareBrackets"] = 12] = "SquareBrackets";
})"
    at /Users/username/projects/jscss/src/parser/parserUtils.ts:201:27
    at Array.jssVariableStatement (/Users/username/projects/jscss/src/parser/jssParser.ts:163:6)
    at /Users/username/projects/jscss/src/parser/parserUtils.ts:267:42
    at Array.stylesheetItem (/Users/username/projects/jscss/src/parser/jssParser.ts:248:6)
    at /Users/username/projects/jscss/src/parser/parserUtils.ts:267:42
    at jssStatement (/Users/username/projects/jscss/src/parser/jssParser.ts:263:6)
    at /Users/username/projects/jscss/src/parser/parserUtils.ts:495:28
    at parseJssScript (/Users/username/projects/jscss/src/parser/jssParser.ts:15:36)
    at processInput (/Users/username/projects/jscss/src/bin/jss.ts:62:9)
    at processCmdCommand (/Users/username/projects/jscss/src/bin/jss.ts:104:13)`
        });
        expect(trace.name).toEqual('Error');
        expect(trace.errorMessage).toEqual(MESSAGE);
        expect(trace.stack).toBeDefined();
    });

    it('parses an Error', () => {
        try {
            throw new Error('it is an error');
        } catch(e) {
            const stack = StackTrace.fromError(e);
            expect(stack.errorMessage).toEqual('it is an error');
        }
    });
});

describe('StackLine', () => {
    it('parses stacklines', () => {
        expect(StackLine.fromStackLine(`     at Module.load (node:internal/modules/cjs/loader:1004:32)`)).toEqual({
            filePath: "node:internal/modules/cjs/loader",
            moduleName: 'Module.load',
            position: {
                col: 32,
                line: 1004,
            }
        });
    });

});

describe('class VmScriptStrackTrace', () => {
    it('cuts the stack trace', () => {
        const st = StackTrace.fromError({
            name: 'Error',
            message: 'error',
            stack: `Error: error
     at error (error1.jss:1:0)
     at JssStyleBlock.<anonymous> (error1.jss:10:20)
     at error1.jss:18:14
     at error1.jss:20:14
     at Script.runInContext (node:vm:141:12)
     at evalCode (/Users/username/projects/jscss/src/bin/eval.ts:27:23)
     at Object.<anonymous> (/Users/username/projects/jscss/src/bin/jss.ts:56:13)
     at Module._compile (node:internal/modules/cjs/loader:1126:14)
     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1180:10)
     at Module.load (node:internal/modules/cjs/loader:1004:32)`
        });

        const trace = VmScriptStrackTrace.fromStackTrace(st);
        expect(trace.errorMessage).toEqual('error');
        expect(trace.stack[0]).toEqual({
            moduleName: "error",
            filePath: "error1.jss",
            position: {
                line: 1,
                col: 0
            }
        });
        expect(trace.stack[trace.stack.length - 1]).toEqual({
            filePath: "error1.jss",
            position: {
                line: 20,
                col: 14
            }
        });

    });

    it('parses syntax token', () => {
        const error = new SyntaxError('error');
        error.name = 'SyntaxError';
        error.stack = `jss.js:4246
export _styles;
^^^^^^

SyntaxError: Unexpected token 'export'
    at new Script (node:vm:100:7)
    at evalCode (/Users/username/projects/jscss/src/bin/eval.ts:29:24)
    at processInput (/Users/username/projects/jscss/src/bin/jss.ts:69:9)
    at processCmdCommand (/Users/username/projects/jscss/src/bin/jss.ts:103:13)
    at Object.<anonymous> (/Users/username/projects/jscss/src/bin/jss.ts:120:5)
    at Module._compile (node:internal/modules/cjs/loader:1155:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1209:10)
    at Module.load (node:internal/modules/cjs/loader:1033:32)
    at Function.Module._load (node:internal/modules/cjs/loader:868:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)`;

        const st = StackTrace.fromError(error);
        expect(st.errorPlace.toString()).toEqual(`jss.js:4246
export _styles;
^^^^^^`);

        const trace = VmScriptStrackTrace.fromStackTrace(st);
        expect(trace.errorMessage).toEqual('error');
        expect(trace.stack).toEqual([]);
    });


    it('parses syntax token 2', () => {
        const error = new SyntaxError("Unexpected token ':'");
        error.name = 'SyntaxError';
        error.stack = `atom.io.css:1215
    -webkit-appearance: none;
                      ^

SyntaxError: Unexpected token ':'
    at new Script (node:vm:100:7)
    at evalCode (/Users/vital/projects/jscss/src/bin/eval.ts:29:24)
    at processInput (/Users/vital/projects/jscss/src/bin/jss.ts:69:9)
    at processCmdCommand (/Users/vital/projects/jscss/src/bin/jss.ts:103:13)
    at Object.<anonymous> (/Users/vital/projects/jscss/src/bin/jss.ts:120:5)
    at Module._compile (node:internal/modules/cjs/loader:1155:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1209:10)
    at Module.load (node:internal/modules/cjs/loader:1033:32)
    at Function.Module._load (node:internal/modules/cjs/loader:868:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)`;


        const st = StackTrace.fromError(error);
        expect(st.errorPlace.toString()).toEqual(`atom.io.css:1215
    -webkit-appearance: none;
                      ^`);

        const trace = VmScriptStrackTrace.fromStackTrace(st);
        expect(trace.errorMessage).toEqual("Unexpected token ':'");
        expect(trace.stack).toEqual([]);
    });
});
