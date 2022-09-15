import { StringInputStream } from "stream/input";

export class ProcessArgsInputStream extends StringInputStream {
    constructor() {
        super(process.argv.slice(2).join(' '));
    }

}
