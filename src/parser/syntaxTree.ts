import { Position } from "stream/position";

export type SyntaxTree = JssNode[];

export type JssNode = IgnoreNode | JsRawNode |
    JssBlockNode | CssImportNode | JssSelectorNode |
    CommentNode | JssVarDeclarationNode | CssCharsetNode;

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
    JssSpread,

    JssBlock,
    JssDeclaration,
    JssSelector,
    JssVarDeclaration,
    JssMedia,
}

export enum BlockType {
    RoundBracket,
    SquareBracket,
    CurlyBracket,
}

export interface BlockNode<N extends Node = Node> extends Node {
    type: NodeType.Block,
    readonly blockType: BlockType,
    readonly items: N[],
}

export interface Node {
    readonly type: NodeType;
    rawValue?: string;
}

export interface StringNode extends SourceMappedNode {
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

export interface JssScriptNode extends MultiNode {
    type: NodeType.JsScript,
}

export interface JsModuleNode extends MultiNode {
    type: NodeType.JsModule,
}

export type CssBlockItemNode = CssDeclarationNode | IgnoreNode;
export interface CssBlockNode extends Node {
    type: NodeType.CssBlock,
    readonly selectors: CssSelectorNode[],
    readonly items: CssBlockItemNode[],
}

export type JssBlockItemNode = CssDeclarationNode | JssDeclarationNode | IgnoreNode | JssBlockNode | JssSpreadNode;
export interface JssBlockNode extends Node {
    type: NodeType.JssBlock,
    readonly selectors: JssSelectorNode[],
    readonly items: JssBlockItemNode[],
}

export interface CssImportNode extends Node, SourceMappedNode {
    type: NodeType.CssImport,
    readonly path: string,
}

export interface CssCharsetNode extends Node, SourceMappedNode {
    type: NodeType.CssCharset,
    readonly rawValue: string,
}

export interface LazyNode extends Node {
    type: NodeType.Lazy,
    value: string,
}

export interface CssSelectorNode extends Node {
    type: NodeType.CssSelector,
    readonly items: string[];
}

export interface JssSelectorNode extends Node, SourceMappedNode {
    type: NodeType.JssSelector,
    readonly items: string[];
}

interface SourceMappedNode {
    readonly position: Position;
}

export interface JsRawNode extends Node, SourceMappedNode {
    readonly type: NodeType.Raw,
    readonly value: string;
}

export interface CssMediaNode extends Node {
    readonly type: NodeType.CssMedia,
    readonly mediaList: string[],
    readonly items: CssBlockNode[],
}

export interface JssMediaNode extends Node, SourceMappedNode {
    readonly type: NodeType.JssMedia,
    readonly mediaList: string[],
    readonly items: JssBlockNode[],
}

export interface CssDeclarationNode extends Node {
    readonly type: NodeType.CssDeclaration,
    readonly prop: string,
    readonly value: any,
    readonly prio?: string,
    readonly propPos: Position,
    readonly valuePos: Position,
    readonly prioPos?: Position,
}

export interface JsTemplateNode extends Node {
    readonly type: NodeType.JsTemplate,
    readonly value: string,
}

export interface JssDeclarationNode extends Node {
    readonly type: NodeType.JssDeclaration,
    readonly prop: string,
    readonly propPos: Position;
    readonly value: any;
    readonly valuePos: Position;
}

export interface JssVarDeclarationNode extends Node {
    readonly type: NodeType.JssVarDeclaration,
    readonly keyword : 'const' | 'var' | 'let',
    readonly keywordPos: Position;
    readonly name: string;
    readonly namePos: Position;
    readonly items: JssBlockItemNode[];
    readonly hasExport : boolean;
    readonly exportPos?: Position;
}

export interface JssSpreadNode extends Node {
    readonly type: NodeType.JssSpread,
    readonly value: string,
    readonly valuePos: Position,
}
