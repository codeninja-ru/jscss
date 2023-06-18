import path from 'path';

import { GeneratedCode, translator } from 'translator/translator';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import { jssLexer } from 'lexer/jssLexer';
import { File } from 'stream/input/file';

export interface Compiler {
    compile(file : File,
            outfilepath : string) : GeneratedCode;
}

export class JssCompiler implements Compiler {
    compile(file : File,
            outfilepath : string) : GeneratedCode {

        const resultFileName = path.basename(outfilepath);
        return translator(
            parseJssScript(new ArrayTokenStream(
                jssLexer(file.inputStream())
            )),
            file.fileName(),
            resultFileName,
        );
    }
}
