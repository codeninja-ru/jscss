import { File, FsFile } from "./file";
import path from 'path';
import { createRequire } from 'module';
import { Compiler, JssCompiler } from "bin/compiler";
import { MainLoader } from "bin/loader/loader";

export interface ModulePath {
    file(fileName : string) : File;
    createRequire() : NodeRequire;
    modulePath() : string;
    compiler() : Compiler;
}

export class FsModulePath implements ModulePath {
    private _compiler = new JssCompiler();
    constructor(private _modulePath : string,
                private fileName : string) {}

    createRequire(): NodeRequire {
        const require = createRequire(path.join(
            path.resolve(
                this._modulePath,
            ),
            this.fileName
        ));

        const loader = new MainLoader(this);

        const newRequire = (id : string) : any => {
            const file = this.file(id);
            return loader.load(file, id);
        }
        newRequire.resolve = require.resolve;
        newRequire.cache = require.cache;
        newRequire.extensions = require.extensions;
        newRequire.main = require.main;

        return newRequire;
    }

    file(fileName: string): File {
        return new FsFile(path.resolve(this._modulePath, fileName));
    }

    modulePath() : string {
        return this._modulePath;
    }

    compiler() : Compiler {
        return this._compiler;
    }
}
