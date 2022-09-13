import { argv } from 'process';
import path from 'path';
import fs from 'fs';
import { translator } from 'translator/translator';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import { evalCode } from './eval';

// --enable-source-maps doesn't work by unkown reason
import 'source-map-support/register';

const [,execname, infile, outfile] = argv;

function printUsage() {
console.log(`Usage: ${path.basename(execname)} [options] filename [outputfile]

options:
 -js prints translated javascript
`);
}

if (infile === undefined) {
    printUsage();
    process.exit(1);
}

if (!fs.existsSync(infile)) {
    printUsage();
    console.error(`filename ${infile} is not found`)
    process.exit(1);
}

function getOutFilePath(infilepath : string) : string {
    const {dir, name} = path.parse(infilepath);
    return path.join(dir, name + '.css');
}

const infilepath = path.normalize(infile);
const outfilepath = outfile ? outfile : getOutFilePath(infilepath);

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

evalCode(outStr, inputFileName).then((result) => {
    console.log(result.output);
}).catch(() => {
    process.exit(1);
})
