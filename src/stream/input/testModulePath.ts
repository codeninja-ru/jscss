import path from 'path';
import { Position } from 'stream/position';
import { File } from "./file";
import { FsModulePath, ModulePath } from "./modulePath";
import { TestFile } from "./testFile";

export interface VirtualFile {
    readonly startPos : Position;
    readonly content: string;
}
export interface VirtualFilesCache {
    [fileName : string] : VirtualFile
}

export class TestModulePath extends FsModulePath implements ModulePath {
    private virtualFiles : VirtualFilesCache = {};
    file(fileName: string): File {
        const name = path.basename(fileName);
        if (this.virtualFiles[name]) {
            return new TestFile(
                path.join(this.modulePath(), fileName),
                this.virtualFiles[name]
            );
        } else {
            return super.file(fileName);
        }
    }

    addVirtualFile(fileName : string, virtualFile : VirtualFile) : void {
        this.virtualFiles[fileName] = virtualFile;
    }
}
