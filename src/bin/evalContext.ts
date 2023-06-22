import { HexColor, RgbColor } from "translator/lib/colors/color";
import { isJssStyleSheet, JssAtRuleBlock, JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet, JssSupportsBlock } from "translator/lib/core";
import { Em, Percent, Px, Units } from "translator/lib/units/unit";
import vm from "vm";
import { CommonJsScript } from "./script/commonJsScript";

export enum EvalStatucCode {
    Success,
    Error,
}

export interface EvalResult<T = string, E = any> {
    readonly output : T;
    readonly statusCode: EvalStatucCode;
    readonly exports : any;
}

export class EvalContext {
    private readonly context : vm.Context;
    constructor(requireFunction : NodeRequire) {
        this.context = vm.createContext({
            'exports' : {},
            'require' : requireFunction,
            'JssStylesheet': JssStyleSheet,
            'JssStyleBlock': JssStyleBlock,
            'JssBlock' : JssBlock,
            'JssBlockCaller' : JssBlockCaller,
            'JssMediaQueryBlock': JssMediaQueryBlock,
            'JssSupportsBlock': JssSupportsBlock,
            'JssAtRuleBlock': JssAtRuleBlock,
            'Px' : Px,
            'Em' : Em,
            'Percent' : Percent,
            'Dimentions' : Units,
            'RgbColor': RgbColor,
            'HexColor': HexColor,
            'isJssStyleSheet' : isJssStyleSheet,
        });
        vm.createContext(this.context);
    }

    runInContext<R>(script : CommonJsScript<R>) : EvalResult<R> {
        return {
            output: script.script.runInContext(this.context, {
                displayErrors: false,
            }),
            exports: this.context.exports,
            statusCode: EvalStatucCode.Success,
        };
    }
}
