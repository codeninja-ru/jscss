import { requireString } from "bin/requireString";
import { SwcTransformer } from "bin/transformer/swcTransformer";
import { File } from "stream/input/file";
import { Loader } from "./loader";

export class EsmLoader implements Loader {
    private transformer : SwcTransformer = new SwcTransformer();

    load(file: File, id: string) {
        if (file.exists()) {
            const sourceCode = this.transformer.transform(file.inputStream().toString());
            return requireString(sourceCode, id);
        } else {
            throw new Error(`file ${id} doesn't exist`);
        }
    }

}
