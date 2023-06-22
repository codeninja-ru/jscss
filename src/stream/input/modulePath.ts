import { File, FsFile } from "./file";
import path from 'path';
import { createRequire } from 'module';

export interface ModulePath {
    file(fileName : string) : File;
    createRequire() : NodeRequire;
    modulePath() : string;
}

export class FsModulePath implements ModulePath {
    constructor(private _modulePath : string,
                private fileName : string) {}

    createRequire(): NodeRequire {
        return createRequire(path.join(
            path.resolve(
                this._modulePath,
            ),
            this.fileName
        ));
    }

    file(fileName: string): File {
        return new FsFile(path.resolve(this._modulePath, fileName));
    }

    modulePath() : string {
        return this._modulePath;
    }
}
