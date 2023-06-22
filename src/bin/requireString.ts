import Module from 'module';

export function requireString(sourceCode : string,
                              fileName : string) : any {
    var parent = module.parent;
    var m = new Module(fileName, parent == null ? undefined : parent);
    m.filename = fileName;
    // @ts-ignore
    m._compile(sourceCode, fileName);
    return m.exports;
}
