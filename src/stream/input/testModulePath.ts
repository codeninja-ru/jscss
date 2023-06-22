import path from 'path';
import { Position } from 'stream/position';
import { File } from "./file";
import { FsModulePath, ModulePath } from "./modulePath";
import { TestFile } from "./testFile";
import { SwcTransformer } from 'bin/transformer/swcTransformer';
import { requireString } from 'bin/requireString';

export interface VirtualFile {
    readonly startPos : Position;
    readonly content: string;
}
export interface VirtualFilesCache {
    [fileName : string] : VirtualFile
}

export class TestModulePath implements ModulePath {
    private _modulePath : ModulePath;
    private virtualFiles : VirtualFilesCache = {};
    constructor(modulePath : string,
                fileName : string) {
        this._modulePath = new FsModulePath(modulePath, path.basename(fileName));
        this.virtualFiles = {};
    }
    createRequire(): NodeRequire {
        const req = this._modulePath.createRequire();
        const transformer = new SwcTransformer();

        const newReq = (id : string) : any => {
            if (this.virtualFiles[id]) {
                var sourceCode = transformer.transform(this.virtualFiles[id].content);
                return requireString(sourceCode, id);
            } else {
                return req(id);
            }
        };

        newReq.resolve = req.resolve;
        newReq.cache = req.cache;
        newReq.extensions = req.extensions;
        newReq.main = req.main;

        return newReq;
    }
    modulePath(): string {
        return this._modulePath.modulePath();
    }

    file(fileName: string): File {
        const name = path.basename(fileName);
        if (this.virtualFiles[name]) {
            return new TestFile(path.join(this._modulePath.modulePath(), fileName), this.virtualFiles[name]);
        } else {
            return this._modulePath.file(fileName);
        }
    }

    addVirtualFile(fileName : string, virtualFile : VirtualFile) : void {
        this.virtualFiles[fileName] = virtualFile;
    }

}
