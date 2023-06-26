import { Compiler } from "bin/compiler";
import { EvalContext } from "bin/evalContext";
import { makeRequire } from "bin/require";
import { CommonJsScript } from "bin/script/commonJsScript";
import { esmTransform, isTransformNeeded } from "bin/transformer/swcTransformer";
import { File } from "stream/input/file";
import { ModulePath } from "stream/input/modulePath";
import { JssStyleSheet } from "translator/lib/core";
import { Loader } from "./loader";

export class JssLoader implements Loader {
    constructor(private compiler : Compiler,
                private modulePath : ModulePath) {
    }

    load(file : File, id : string) : any {
        if (file.exists()) {
            const generatedCode = this.compiler.compile(file, file.fileName());
            // TODO reuse makeRequire
            const evalContext = new EvalContext(makeRequire(this.modulePath, this.compiler));
            //FIXME it breaks the sourcemaps
            const sourceCode = isTransformNeeded(generatedCode.value)
                ? esmTransform(generatedCode.value) : generatedCode.value;
            const script = new CommonJsScript<JssStyleSheet>(sourceCode, id);
            return evalContext.runInContext(script).exports;
        } else {
            throw new Error(`Cannot find jsslang module '${id}' in '${this.modulePath.modulePath()}'`);
        }
    }
}
