#!/usr/bin/env node

import { argLexer } from 'argLexer';
import fs from 'fs';
import { ArgNodeType, CommandErrorArgNode, InputAndOutputArgNode, parseArgsStatement } from 'parser/argParser';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import path from 'path';
import { argv } from 'process';
// --enable-source-maps doesn't work by unkown reason
import 'source-map-support/register';
import { ProcessArgsInputStream } from 'stream/input/ProcessArgsInputStream';
import { translator } from 'translator/translator';
import { evalCode, EvalStatucCode } from './eval';
import { BasicStackTracePrinter, StackTrace } from './stackTrace';


const [,execname] = argv;

function printUsage() {
console.log(`Usage: ${path.basename(execname)} [options] <input.jss> [output.css]
Complies JSS to CSS

If input is set to '-', input is read from stdin
If input is set to '-' and output is absent, input is read from stdin and output is written to stdout
If output is set to '-', output is written to stdout

options:
 --sourcemap=[output.map.css] generates sourcemap
 --inline-sourcemap generates inline sourcemap
 -js prints translated javascript
 -h, --help this message
 -v, --version prints version
`);
}

function processInput(node : InputAndOutputArgNode) {
    if (!fs.existsSync(node.inputFile)) {
        console.error(`\nfilename ${node.inputFile} is not found`)
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
            if (result.statusCode == EvalStatucCode.Success) {
                if (node.outputFile == '-' || (node.inputFile == '-' && node.inputFile === undefined)) {
                    console.log(result.output);
                } else {
                    console.log(outfilepath);
                    //fs.writeFileSync(infilepath, result.output);
                }
            } else if (result.statusCode == EvalStatucCode.Error) {
                process.exit(1);
            } else {
                console.error('unsupported EvalStatusCode');
            }
        }).catch(() => {
            process.exit(1);
        });
    }

}

function printVersion() {
    console.log('Version: 0.0');
}

function printCommandError(node : CommandErrorArgNode) {
    console.log(node.message);
    console.log('\nuse -h or --help to see the manual');
    process.exit(1);
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
        case ArgNodeType.CommandError:
            printCommandError(node);
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
