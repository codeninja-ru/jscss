import fs from 'fs';
import { InputStream } from './InputStream';
import { StringInputStream } from "./StringInputStream";

export class FileInputStream {
    private constructor() {
    }

    static fromFile(filePath : string) : InputStream {
        const content = fs.readFileSync(filePath).toString() ;
        return new StringInputStream(content);
    }
}
