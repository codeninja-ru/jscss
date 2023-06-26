import { StringInputStream } from "stream/input";
import { InputStream } from './InputStream';
import fs from 'fs';
import path from 'path';

export interface File {
    exists() : boolean;
    inputStream() : InputStream;
    fileName() : string;
    ext() : string;
    filePath() : string;
}

export class FsFile implements File {
    private readonly infilepath : string;
    constructor(infilepath : string) {
        this.infilepath = this.fixFilePath(infilepath);
    }

    private fixFilePath(infilepath : string) : string {
        const ext = path.extname(infilepath);

        if (ext == '') {
            if (fs.existsSync(infilepath)) {
                return infilepath;
            } else {
                return infilepath + '.js';
            }
        } else {
            return infilepath;
        }
    }

    filePath(): string {
        return this.infilepath;
    }

    ext(): string {
        return path.extname(this.infilepath);
    }

    exists(): boolean {
        return fs.existsSync(this.infilepath);
    }

    fileName() : string {
        return path.basename(this.infilepath);
    }

    inputStream(): InputStream {
        return new StringInputStream(fs.readFileSync(this.infilepath).toString());
    }
}
