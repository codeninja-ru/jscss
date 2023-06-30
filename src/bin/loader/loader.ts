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

    constructor(modulePath : ModulePath) {

        this.jssLoader = new JssLoader(modulePath);
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
