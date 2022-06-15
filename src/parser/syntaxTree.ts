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
    JsModule,
    ImportDeclaration,
    ExportDeclaration,

    Lazy,
    Block,
    Ignore,

    CssSelector,
    CssCharset,
    CssMedia,
    CssDeclaration,

    JsTemplate,

    JssScript,
    JssDeclaration,
}

export enum BlockType {
    RoundBracket,
    SquareBracket,
    CurlyBracket,
}

export interface Node {
    readonly type: NodeType;
    rawValue?: string;
}

export interface RawNode extends Node {
    type: NodeType.Raw;
    value: string;
}

export interface IgnoreNode extends Node {
    readonly type: NodeType.Ignore;
    readonly items: string[];
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

export interface JssScriptNode extends MultiNode {
    type: NodeType.JssScript,
}

export interface JsModuleNode extends MultiNode {
    type: NodeType.JsModule,
}

export interface CssBlockNode extends Node {
    type: NodeType.CssBlock,
    readonly selectors: any,
    readonly block: BlockNode,
}

export interface BlockNode extends Node {
    type: NodeType.Block,
    blockType:  BlockType,
    readonly items: Node[];
}

export interface CssImportNode extends Node {
    type: NodeType.CssImport,
    readonly path: string,
}

export interface LazyNode extends Node {
    type: NodeType.Lazy,
    value: string,
}

export interface CssSelectorNode extends Node {
    type: NodeType.CssSelector,
    readonly items: string[];
}

export interface JsRawNode extends Node {
    readonly type: NodeType,
    readonly value: string;
}

export interface CssMediaNode extends Node {
    readonly type: NodeType.CssMedia,
    readonly mediaList: string[],
    readonly items: CssBlockNode[],
}

export interface CssDeclarationNode extends Node {
    readonly type: NodeType.CssDeclaration,
    readonly prop: string,
    readonly value: any,
    readonly prio?: string,
}

export interface JsTemplateNode extends Node {
    readonly type: NodeType.JsTemplate,
    readonly value: string,
}

export interface JssDeclarationNode extends Node {
    readonly type: NodeType.JssDeclaration,
    readonly prop: string,
    readonly value: any,
}
