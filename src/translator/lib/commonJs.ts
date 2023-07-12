/**
 * implements
 * @code export * from './lib';
 *
 * usage:
 * @code _export_star(require("./lib"), exports);
 * */
export function _export_star(to : any,
                             from : any) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}

interface NamedExportVar {
    [name : string] : string;
}
export function _export_named_export(exports : any,
                                     vars : NamedExportVar,
                                     lib: any) : void {
    for(var name in vars) {
        const asName = vars[name];
        Object.defineProperty(exports, asName, {
            enumerable: true,
            get: () => lib[asName],
        });
    }
}

export function _export(target : any, all : any) {
    for(var name in all) {
        Object.defineProperty(target, name, {
            enumerable: true,
            get: all[name]
        });
    }
}
