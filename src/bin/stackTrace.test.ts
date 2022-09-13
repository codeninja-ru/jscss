import { StackTrace, VmScriptStrackTrace } from "./stackTrace";

describe('StackTrace', () => {
    const STACK_TRACE = `Error: error
    at error (error1.jss:6:11)
    at JssStyleBlock.<anonymous> (error1.jss:15:28)
    at error1.jss:18:14
    at error1.jss:20:14
    at Script.runInContext (node:vm:141:12)
    at evalCode (/Users/vital/projects/jscss/src/bin/eval.ts:26:23)
    at Object.<anonymous> (/Users/vital/projects/jscss/src/bin/jss.ts:56:13)
    at Module._compile (node:internal/modules/cjs/loader:1126:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1180:10)
    at Module.load (node:internal/modules/cjs/loader:1004:32)`;

    it('parses valid stack string', () => {
        const trace = StackTrace.fromString(STACK_TRACE);

        expect(trace.errorMessage).toEqual('Error: error');
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

    it('parses an Error', () => {
        try {
            throw new Error('it is an error');
        } catch(e) {
            const stack = StackTrace.fromError(e);
            expect(stack.errorMessage).toEqual('Error: it is an error');
        }
    });


});

describe('class VmScriptStrackTrace', () => {
    it('cuts the stack trace', () => {
        const st = StackTrace.fromString(`Error: error
     at error (error1.jss:1:0)
     at JssStyleBlock.<anonymous> (error1.jss:10:20)
     at error1.jss:18:14
     at error1.jss:20:14
     at Script.runInContext (node:vm:141:12)
     at evalCode (/Users/vital/projects/jscss/src/bin/eval.ts:27:23)
     at Object.<anonymous> (/Users/vital/projects/jscss/src/bin/jss.ts:56:13)
     at Module._compile (node:internal/modules/cjs/loader:1126:14)
     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1180:10)
     at Module.load (node:internal/modules/cjs/loader:1004:32)`);

        const trace = VmScriptStrackTrace.fromStackTrace(st);
        expect(trace.errorMessage).toEqual('Error: error');
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

});
