import fs from 'fs';
import { StringInputStream } from "./StringInputStream";

export class FileInputStream extends StringInputStream {
    constructor(filePath : string) {
        const content = fs.readFileSync(filePath).toString() ;
        super(content);
    }
}
