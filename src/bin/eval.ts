import { JssBlock, JssBlockCaller, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import vm from "vm";

export function evalCode(sourceCode : string) : string {
    const context = {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
    };

    try {
        const script = new vm.Script(sourceCode.replace('export _styles', '_styles'));
        vm.createContext(context);
        return script.runInContext(context).toCss();
    } catch(e) {
        console.log(sourceCode);
        console.error(e);
        throw e;
    }
}
