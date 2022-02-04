export type SyntaxTree = Node[];

export enum NodeType {
    JsImport,
    Comment,
    Raw,
}

export interface Node {
    readonly type: NodeType;
}

export interface ImportVar {
    name: string;
    asName: string | null;
}

export interface RawNode extends Node {
    type: NodeType.Raw;
    value: string;
}

// import defaultVar as asName, { var1 as asName1, var2 as asName2 } from 'path';
export interface JsImportNode extends Node {
    type: NodeType.JsImport;
    readonly path: string;
    defaultVar: ImportVar | null;
    vars: ImportVar[] | null;
}

export interface CommentNode extends Node {
    type: NodeType.Comment,
    value: string;
}
