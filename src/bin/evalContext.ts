import { HexColor, RgbColor } from "translator/lib/colors/color";
import { isJssStyleSheet, JssAtRuleBlock, JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet, JssSupportsBlock } from "translator/lib/core";
import { Em, Percent, Px, Units } from "translator/lib/units/unit";
import vm from "vm";
import { Script } from "./script";

export enum EvalStatucCode {
    Success,
    Error,
}

export interface EvalResult<T = string> {
    readonly output : T;
    readonly statusCode: EvalStatucCode;
}

export class EvalContext {
    private readonly context : vm.Context;
    constructor(requireFunction : NodeRequire) {
        this.context = vm.createContext({
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

    runInContext<R>(script : Script<R>) : EvalResult<R> {
        return {
            output: script.script.runInContext(this.context, {
                displayErrors: false,
            }),
            statusCode: EvalStatucCode.Success,
        };
    }
}
