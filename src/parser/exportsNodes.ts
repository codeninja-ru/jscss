import { LiteralToken, StringToken } from "token";
import { LazyBlockParser, SourceAndValue } from "./parserUtils";
import { AssignmentExpressionNode, AsyncFunctionEpressionNode, AsyncGeneratorEpressionNode, ClassDeclarationNode, FunctionEpressionNode, GeneratorEpressionNode, VarDeclarationNode, VarStatementNode } from "./syntaxTree";

export enum ExportDeclarationType {
    ExportFromClause,
    NamedExports,
    VarStatement,
    Default,
    Declaration,
};

export type HoistableDeclaration = FunctionEpressionNode | GeneratorEpressionNode
    | AsyncFunctionEpressionNode | AsyncGeneratorEpressionNode;
export type ExportDeclarationValue = ExportFromClause | NamedExports | ExportVarStatement
    | ExportDefault | ExportDeclaration;
export type Declaration = HoistableDeclaration | ClassDeclarationNode
    | VarDeclarationNode;


type IdentifierName = LiteralToken;

export type FromClause = '*' | IdentifierName | NamedExports;

export class ExportFromClause {
    readonly type = ExportDeclarationType.ExportFromClause;

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
    readonly type = ExportDeclarationType.NamedExports;

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

export interface ExportDefaultNode {
    readonly type: ExportDeclarationType.Default,
    readonly value: SourceAndValue<HoistableDeclaration |
        ClassDeclarationNode | AssignmentExpressionNode>,
}

export class ExportDeclaration {
    readonly type = ExportDeclarationType.Declaration;
    constructor(readonly value : SourceAndValue<Declaration>) {
    }
}

export class ExportDefault {
    readonly type = ExportDeclarationType.Default;
    constructor(readonly value : SourceAndValue<HoistableDeclaration
        | ClassDeclarationNode | AssignmentExpressionNode>) {
    }
}

export class ExportVarStatement {
    readonly type = ExportDeclarationType.VarStatement;
    constructor(readonly value : SourceAndValue<VarStatementNode>) {
    }
}
