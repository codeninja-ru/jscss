import vm from "vm";
import { createRequire } from 'module';
import { BasicStackTracePrinter, SourceMappedStackTrace, StackTrace, VmScriptStrackTrace } from "./stackTrace";
import { SourceMapConsumer } from "source-map";
import { GeneratedCode } from "translator/translator";
import { evalContext } from "./evalContext";

export enum EvalStatucCode {
    Success,
    Error,
}

export interface EvalResult {
    readonly output : string;
    readonly statusCode: EvalStatucCode;
}

export function evalCode(sourceCode : GeneratedCode,
                         fileName : string,
                         modulePath : string) : Promise<EvalResult> {
    const contextRequire = createRequire(modulePath);
    const context = vm.createContext({
        'require' : contextRequire,
        ...evalContext(),
    });

    try {
        const script = new vm.Script(sourceCode.value, {
            filename: fileName,
        });

        vm.createContext(context);
        return Promise.resolve({
            output: script.runInContext(context, {
                displayErrors: false,
            }).toCss(),
            statusCode: EvalStatucCode.Success,
        });
    } catch(e) {
        return new Promise((resolve, reject) => {
            SourceMapConsumer.fromSourceMap(sourceCode.sourceMapGen)
                .then((consumer) => {
                    const stackTrace = new SourceMappedStackTrace(
                        consumer,
                        VmScriptStrackTrace.fromStackTrace(StackTrace.fromError(e)),
                    );

                    const printer = new BasicStackTracePrinter();
                    printer.print(stackTrace);

                    reject({
                        evalCode: EvalStatucCode.Error,
                    });
                }).catch((err) => {
                    console.log(e);
                    throw err;
                });

        });
    }
}
