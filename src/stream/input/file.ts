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
    constructor(private readonly infilepath : string) {}

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
