import { JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import vm from "vm";
import Module from 'module';
import { BasicStackTracePrinter, SourceMappedStackTrace, StackTrace, VmScriptStrackTrace } from "./stackTrace";
import { SourceMapConsumer } from "source-map";
import { GeneratedCode } from "translator/translator";
import { Px, Em, Percent, Dimentions } from "translator/lib/dimentions/dimention";

export enum EvalStatucCode {
    Success,
    Error,
}

export interface EvalResult {
    readonly output : string;
    readonly statusCode: EvalStatucCode;
}

export function evalCode(sourceCode : GeneratedCode,
                         fileName : string) : Promise<EvalResult> {
    const contectModule = new Module(fileName);
    const context = {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
        'JssMediaQueryBlock': JssMediaQueryBlock,
        'require' : contectModule.require.bind(contectModule),
        'module' : contectModule,
        'exports' : contectModule.exports,

        'Px' : Px,
        'Em' : Em,
        'Percent' : Percent,
        'Dimentions' : Dimentions,
    };

    try {
        const script = new vm.Script(sourceCode.value.replace('export _styles', '_styles'), {
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
