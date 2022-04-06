export type SyntaxTree = Node[];

export enum NodeType {
    JsImport,
    Comment,
    Raw,
    VarDeclaration,
    VarStatement,
    JsStatement,
    CssBlock,
    CssImport,
    JsScript,
    FunctionExpression,
    IfStatement,
    ExpressionStatement,
    Expression,

    Lazy,
}

export interface Node {
    readonly type: NodeType;
    rawValue?: string;
}

export interface RawNode extends Node {
    type: NodeType.Raw;
    value: string;
}

// import namespace from ...
export interface JsImportNamespace {
    readonly varName?: string;
    readonly varAlias?: string;
}

// import defaultVar as asName, { var1 as asName1, var2 as asName2 } from 'path';
export interface JsImportNode extends Node {
    type: NodeType.JsImport;
    readonly path?: string;
    readonly vars?: JsImportNamespace[];
}

export interface CommentNode extends Node {
    type: NodeType.Comment,
    value: string;
}

export interface VarDeclaraionNode extends Node {
    type: NodeType.VarDeclaration,
    name: Node,
    value?: Node,
}

export interface MultiNode extends Node {
    items: Node[];
}

export interface IfNode extends Node {
    type: NodeType.IfStatement,
    cond: Node,
    left?: Node,
    right?: Node,
}

export interface JsScriptNode extends MultiNode {
    type: NodeType.JsScript,
}

export interface CssBlockNode extends Node {
    type: NodeType.CssBlock,
    selectors: any,
    block: any,

}

export interface CssImportNode extends Node {
    type: NodeType.CssImport,
    readonly path: string,
}

export interface LazyNode extends Node {
    type: NodeType.Lazy,
    value: string,
}
