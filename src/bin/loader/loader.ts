import { Compiler } from "bin/compiler";
import { File } from "stream/input/file";
import { ModulePath } from "stream/input/modulePath";
import { EsmLoader } from "./esmLoader";
import { JssLoader } from "./jssLoader";
import { PlainLoader } from "./plainLoader";

export interface Loader {
    load(file : File, id : string) : any;
}

export class MainLoader implements Loader {
    private jssLoader : JssLoader;
    private plainLoader : PlainLoader;
    private esmLoader : EsmLoader;

    // TODO modulePath is only needed for error massage. error massage can be moved out
    constructor(modulePath : ModulePath,
                compiler : Compiler) {

        this.jssLoader = new JssLoader(compiler, modulePath);
        this.plainLoader = new PlainLoader(modulePath);
        this.esmLoader = new EsmLoader();
    }

    load(file: File, id: string) {
        const ext = file.ext();

        if (ext == '.jss') {
            return this.jssLoader.load(file, id);
        } else if (ext == '.css') {
            return this.plainLoader.load(file, id);
        } else {
            return this.esmLoader.load(file, id);
        }
    }

}
