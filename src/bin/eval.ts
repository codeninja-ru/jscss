import { JssBlock, JssBlockCaller, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import vm from "vm";
import Module from 'module';

export function evalCode(sourceCode : string, fileName : string) : string {
    const contectModule = new Module(fileName);
    const context = {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
        'require' : contectModule.require.bind(contectModule),
        'module' : contectModule,
        'exports' : contectModule.exports,
    };

    try {
        const script = new vm.Script(sourceCode.replace('export _styles', '_styles'), {
            filename: fileName,
        });

        vm.createContext(context);
        return script.runInContext(context).toCss();
    } catch(e) {
        console.log(sourceCode);
        console.error(e);
        throw e;
    }
}
