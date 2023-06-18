import { ModulePath } from 'stream/input/modulePath';
import { JssStyleSheet } from 'translator/lib/core';
import { Compiler } from './compile';
import { EvalContext } from './evalContext';
import { Script } from './script';

export function makeRequire(modulePath : ModulePath,
                            compiler: Compiler) : NodeRequire {
    const require = modulePath.createRequire();
    const newRequire = function(id : string) : any {
        const file = modulePath.file(id);
        const ext = file.ext();
        if (ext == '.jss') {
            if (file.exists()) {
                const generatedCode = compiler.compile(file, id);
                const evalContext = new EvalContext(require);
                const script = new Script<JssStyleSheet>(generatedCode.value, id);
                return evalContext.runInContext(script).output;
            } else {
                throw new Error(`Cannot find jsslang module '${id}' in '${modulePath.modulePath()}'`);
            }
        } else if (ext == '.css') {
            if (file.exists()) {
                return file.inputStream().toString();
            } else {
                throw new Error(`Cannot find css module '${id}' in '${modulePath.modulePath()}'`);
            }
        } else {
            return require(file.filePath());
        }

    }
    newRequire.resolve = require.resolve;
    newRequire.cache = require.cache;
    newRequire.extensions = require.extensions;
    newRequire.main = require.main;

    return newRequire;
}
