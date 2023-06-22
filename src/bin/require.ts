import { ModulePath } from 'stream/input/modulePath';
import { Compiler } from './compiler';
import { MainLoader } from './loader/loader';

export function makeRequire(modulePath : ModulePath,
                            compiler: Compiler) : NodeRequire {
    const require = modulePath.createRequire();
    const loader = new MainLoader(modulePath, compiler);

    const newRequire = function(id : string) : any {
        const file = modulePath.file(id);
        return loader.load(file, id);
    }
    newRequire.resolve = require.resolve;
    newRequire.cache = require.cache;
    newRequire.extensions = require.extensions;
    newRequire.main = require.main;

    return newRequire;
}
