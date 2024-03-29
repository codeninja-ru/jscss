import { ModulePath } from "stream/input/modulePath";
import { JssStyleSheet } from "translator/lib/core";
import { GeneratedCode } from "translator/translator";
import { EvalContext, EvalResult, EvalStatucCode } from "./evalContext";
import { CommonJsScript } from "./script/commonJsScript";
import { BasicStackTracePrinter, StackTrace, VmScriptStrackTrace } from "./stackTrace";

export function evalCode(sourceCode : GeneratedCode,
                         fileName : string,
                         modulePath : ModulePath) : EvalResult {

    const evalContext = new EvalContext(modulePath.createRequire());

    try {
        const script = new CommonJsScript<JssStyleSheet>(sourceCode.value, fileName);
        const toCssScript = new CommonJsScript<string>("_styles.toCss();", fileName);

        evalContext.runInContext(script);
        return evalContext.runInContext(toCssScript);
    } catch(e) {
        const stackTrace = VmScriptStrackTrace.fromStackTrace(StackTrace.fromError(e));

        const printer = new BasicStackTracePrinter();
        printer.print(stackTrace);

        return {
            statusCode: EvalStatucCode.Error,
            exports: {},
            output: '',
        };
    }
}
