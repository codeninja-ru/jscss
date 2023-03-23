import { parseJssScript } from "parser/jssParser";
import { translator } from "translator/translator";
import { ArrayTokenStream } from "parser/tokenStream";
import vm from "vm";
import { evalContext } from "bin/evalContext";
import { JssStyleSheet } from "translator/lib/core";

export function evalTestCode(css : string,
                             line = 1,
                             col = 1,
                             sourceFileName = 'result.jss',
                             resultFileName = 'result.css') : JssStyleSheet {
    const sourceCode = translator(parseJssScript(ArrayTokenStream.fromString(css, line, col)),
                                 sourceFileName,
                                 resultFileName);
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

export function evalTestCodeFile(css : string,
                                 sourceFileName : string,
                                 resultFileName: string
                                ) : JssStyleSheet {
    return evalTestCode(css, 1, 1, sourceFileName, resultFileName);
}
