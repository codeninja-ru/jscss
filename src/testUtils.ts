import { parseJssScript } from "parser/jssParser";
import { translator } from "translator/translator";
import { ArrayTokenStream } from "parser/tokenStream";
import vm from "vm";
import { evalContext } from "bin/evalContext";
import { JssStyleSheet } from "translator/lib/core";

export function evalTestCode(css : string, line = 1, col = 1) : JssStyleSheet {
    const sourceCode = translator(parseJssScript(ArrayTokenStream.fromString(css, line, col)),
                                 'result.jss',
                                 'result.css');
    const context = {
        ...evalContext(),
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
