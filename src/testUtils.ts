import { JssCompiler } from "bin/compiler";
import { EvalContext } from "bin/evalContext";
import { makeRequire } from "bin/require";
import { CommonJsScript } from "bin/script/commonJsScript";
import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import path from 'path';
import { ModulePath, FsModulePath } from "stream/input/modulePath";
import { JssStyleSheet } from "translator/lib/core";
import { GeneratedCode, translator } from "translator/translator";

export const TEST_FOLDER_PATH = path.join(
    __dirname,
    '../test',
);

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
                             modulePath : ModulePath = new FsModulePath(TEST_FOLDER_PATH, 'result.jss'),
                             sourceFileName = 'result.jss',
                             resultFileName = 'result.css') : JssStyleSheet {
    const sourceCode = translateToJs(css, line, col, sourceFileName, resultFileName);
    const evalContext = new EvalContext(makeRequire(
        modulePath,
        new JssCompiler(),
    ));

    try {
        const script = new CommonJsScript<JssStyleSheet>(sourceCode.value, resultFileName);
        return evalContext.runInContext(script).output;
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
    const modulePath = new FsModulePath(TEST_FOLDER_PATH, sourceFileName);
    return evalTestCode(css, 1, 1, modulePath, sourceFileName, resultFileName);
}
