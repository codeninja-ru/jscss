import { argv } from 'process';
import path from 'path';
import fs from 'fs';
import { translator } from 'translator/translator';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import { evalCode } from './eval';

const [,execname, infile, outfile] = argv;

function printUsage() {
console.log(`Usage: ${path.basename(execname)} [options] filename [outputfile]\n`);
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
const outStr = translator(parseJssScript(ArrayTokenStream.fromString(inStr)));

console.log(outStr);
console.log(evalCode(outStr));
