import { File } from "stream/input/file";
import { ModulePath } from "stream/input/modulePath";
import { Loader } from "./loader";

export class NodeLoader implements Loader {
    private require : NodeRequire;
    constructor(modulePath : ModulePath) {
        this.require = modulePath.createRequire();
    }

    load(file: File, id: string) {
        return this.require(file.filePath());
    }
}
