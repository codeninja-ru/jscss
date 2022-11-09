import { JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet } from "translator/lib/core";
import { Px, Em, Percent, Dimentions } from "translator/lib/dimentions/dimention";
import { parseJssScript } from "parser/jssParser";
import { translator } from "translator/translator";
import { ArrayTokenStream } from "parser/tokenStream";
import vm from "vm";

export function evalTestCode(css : string) : JssStyleSheet {
    const sourceCode = translator(parseJssScript(ArrayTokenStream.fromString(css)),
                                 'result.jss',
                                 'result.css');
    const context = {
        'JssStylesheet': JssStyleSheet,
        'JssStyleBlock': JssStyleBlock,
        'JssBlock' : JssBlock,
        'JssBlockCaller' : JssBlockCaller,
        'JssMediaQueryBlock': JssMediaQueryBlock,
        'Px' : Px,
        'Em' : Em,
        'Percent' : Percent,
        'Dimentions': Dimentions,
    };
    try {
        const script = new vm.Script(sourceCode.value.replace('export _styles', '_styles'));
        vm.createContext(context);
        return script.runInContext(context);
    } catch(e) {
        console.log(sourceCode);
        console.error(e);
        throw e;
    }
}