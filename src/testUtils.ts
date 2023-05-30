import { parseJssScript } from "parser/jssParser";
import { GeneratedCode, translator } from "translator/translator";
import { ArrayTokenStream } from "parser/tokenStream";
import { createRequire } from 'module';
import { evalContext } from "bin/evalContext";
import { JssStyleSheet } from "translator/lib/core";

import vm from "vm";
import path from 'path';

export function translateToJs(jss : string,
                             line = 1,
                             col = 1,
                             sourceFileName = 'result.jss',
                             resultFileName = 'result.css') : GeneratedCode {
    return translator(parseJssScript(ArrayTokenStream.fromString(jss, line, col)),
                                 sourceFileName,
                                 resultFileName);
}

export function evalTestCode(css : string,
                             line = 1,
                             col = 1,
                             sourceFileName = 'result.jss',
                             resultFileName = 'result.css') : JssStyleSheet {
    const sourceCode = translateToJs(css, line, col, sourceFileName, resultFileName);
    const contextRequire = createRequire(path.join(
        __dirname,
        '../test',
        sourceFileName,
    ));
    const context = vm.createContext({
        'require' : contextRequire,
        ...evalContext(),
    });
    try {
        const script = new vm.Script(sourceCode.value);
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
