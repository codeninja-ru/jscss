import { File } from "stream/input/file";
import { ModulePath } from "stream/input/modulePath";
import { Loader } from "./loader";

export class PlainLoader implements Loader {
    constructor(private modulePath : ModulePath) {}

    load(file: File, id: string) {
        if (file.exists()) {
            return file.inputStream().toString();
        } else {
            throw new Error(`Cannot find css module '${id}' in '${this.modulePath.modulePath()}'`);
        }
    }
}
