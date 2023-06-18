import { File, FsFile } from "./file";
import { InputStream } from "./InputStream";
import { StringInputStream } from "./StringInputStream";
import { VirtualFile } from "./testModulePath";

export class TestFile implements File {
    private file : File;
    constructor(infilepath : string,
                private entry : VirtualFile) {
        this.file = new FsFile(infilepath);
    }

    exists(): boolean {
        return true;
    }
    inputStream(): InputStream {
        return new StringInputStream(this.entry.content,
                                     this.entry.startPos.line,
                                     this.entry.startPos.col);
    }
    fileName(): string {
        return this.file.fileName();
    }
    ext(): string {
        return this.file.ext();
    }
    filePath(): string {
        return this.file.filePath();
    }

}
