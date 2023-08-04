import { LiteralToken, StringToken } from "token";
import { LazyBlockParser } from "./parserUtils";
import { NodeType } from "./syntaxTree";

type IdentifierName = LiteralToken;

export type FromClause = '*' | IdentifierName | NamedExports;

export class ExportFromClause {
    readonly type = NodeType.ExportFromClause;

    constructor(readonly clause : FromClause,
                readonly path: StringToken) {
    }

}

export class ExportSpecifier {
    constructor(readonly name : LiteralToken,
                readonly asName? : LiteralToken) {

    }
}

export class NamedExports {
    readonly type = NodeType.NamedExports;

    constructor(readonly value : ExportSpecifier[]) {
    }

    static isNamedExports(obj : any) : obj is NamedExports {
        return obj instanceof NamedExports;
    }

}

export enum BindingPatternType {
    ObjectBinding,
    ArrayBinding,
}

export class BindingPattern {
    constructor(readonly type : BindingPatternType,
                readonly pattern : LazyBlockParser<ObjectBindingPattern | ArrayBindingPattern>) {
    }
}

export type VarNames = LiteralToken | BindingPattern;
export class ObjectBindingPattern {
    readonly type = BindingPatternType.ObjectBinding;
    constructor(readonly names : VarNames[]) {}
}

export class ArrayBindingPattern {
    readonly type = BindingPatternType.ArrayBinding;
    constructor(readonly names : VarNames[]) {}
}
