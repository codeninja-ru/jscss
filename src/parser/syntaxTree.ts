export type SyntaxTree = Node[];

export enum NodeType {
    JsImport,
    Comment,
    Raw,
    VarDeclaration,
    JsStatement,
    CssBlock,
    CssImport,
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
    //TODO
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
