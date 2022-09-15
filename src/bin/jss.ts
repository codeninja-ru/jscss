import { argLexer } from 'argLexer';
import fs from 'fs';
import { ArgNodeType, InputAndOutputArgNode, parseArgsStatement } from 'parser/argParser';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import path from 'path';
import { argv } from 'process';
// --enable-source-maps doesn't work by unkown reason
import 'source-map-support/register';
import { ProcessArgsInputStream } from 'stream/input/ProcessArgsInputStream';
import { translator } from 'translator/translator';
import { evalCode } from './eval';
import { BasicStackTracePrinter, StackTrace } from './stackTrace';


const [,execname] = argv;

function printUsage() {
console.log(`Usage: ${path.basename(execname)} [options] filename [outputfile]

options:
 -h, --help this message
 -v, --version prints version
 -js prints translated javascript
`);
}

function processInput(node : InputAndOutputArgNode) {
    if (!fs.existsSync(node.inputFile)) {
        printUsage();
        console.error(`filename ${node.inputFile} is not found`)
        process.exit(1);
    }

    function getOutFilePath(infilepath : string) : string {
        const {dir, name} = path.parse(infilepath);
        return path.join(dir, name + '.css');
    }

    const infilepath = path.normalize(node.inputFile);

    const outfilepath = node.outputFile && node.outputFile != '-'
        ? node.outputFile : getOutFilePath(infilepath);

    if (infilepath == outfilepath) {
        console.error(`filename and outputfile cannot be the same file`)
        process.exit(1);
    }

    const inStr = fs.readFileSync(infilepath).toString() ;
    const resultFileName = path.basename(outfilepath);
    const inputFileName = path.basename(infilepath);
    const outStr = translator(
        parseJssScript(ArrayTokenStream.fromString(inStr)),
        inputFileName,
        resultFileName,
    );

    if (node.hasJsOption) {
        console.log(outStr.value);
    } else {
        evalCode(outStr, inputFileName).then((result) => {
            if (node.outputFile == '-') {
                console.log(result.output);
            } else {
                console.log(result.output);
            }
        }).catch(() => {
            process.exit(1);
        });
    }

}

function printVersion() {
    console.log('Version: 0.0');
}

function processCmdCommand() {
    const node = parseArgsStatement(new ArrayTokenStream(argLexer(new ProcessArgsInputStream())))

    switch(node.type) {
        case ArgNodeType.InputAndOutput:
            processInput(node);
            break;
        case ArgNodeType.Version:
            printVersion();
            break;
        case ArgNodeType.Help:
        case ArgNodeType.Nothing:
        default:
            printUsage();
            break;
    }
}

try {
    processCmdCommand();
} catch(e) {
    console.log(`Error!!!\n`);

    const stack = StackTrace.fromError(e);
    const printer = new BasicStackTracePrinter();
    printer.print(stack);

    if (e.cause) {
        console.log(`\nThe error was caused by:`);
        const causeStack = StackTrace.fromError(e.cause);
        printer.print(causeStack);
    }

    process.exit(1);
}
