import vm from "vm";

export class Script<R> {
    public readonly script : vm.Script;
    constructor(sourceCode : string,
                fileName : string) {
        this.script = new vm.Script(sourceCode, {
            filename: fileName,
        });
    }
}
