import { Position } from "stream/position";
import { LiteralToken, StringToken, SymbolToken } from "token";
import { ExportDeclarationValue, VarNames } from "./exportsNodes";

export type SyntaxTree = JssNode[];

export type JssNode = IgnoreNode | JsRawNode |
    JssBlockNode | CssImportNode | JssSelectorNode |
    CommentNode | JssVarDeclarationNode | CssCharsetNode | JssAtRuleNode |
    JssSupportsNode | FontFaceNode | CssRawNode | JssPageNode |
    ImportDeclarationNode | JssDeclarationNode | ExportDeclarationNode;

export enum NodeType {
    Error,

    Comment,
    Raw,
    VarDeclaration,
    VarStatement,
    ClassDeclaration,
    JsStatement,
    CssBlock,
    CssImport,
    CssRaw,
    JsScript,
    FunctionExpression,
    GeneratorExpression,
    AsyncGeneratorExpression,
    AsyncFunctionExpression,
    IfStatement,
    ExpressionStatement,
    JsModule,
    ImportDeclaration,
    AssignmentExpression,
    ExportDeclaration,

    Lazy,
    Block,
    Ignore,

    CssSelector,
    CssCharset,
    CssMedia,
    CssPage,
    CssDeclaration,
    CssFontFace,

    JsTemplate,
    JssSpread,

    JssBlock,
    JssDeclaration,
    JssSelector,
    JssVarDeclaration,
    JssAtRule,
    JssSupports,
    JssPage,
}

export enum BlockType {
    RoundBracket,
    SquareBracket,
    CurlyBracket,
}

export interface BlockNode<N> extends Node {
    type: NodeType.Block,
    readonly blockType: BlockType,
    readonly items: N,
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

export interface ImportSepcifier {
    readonly name?: LiteralToken | SymbolToken | StringToken,
    readonly moduleExportName?: LiteralToken;
}

// import defaultVar as asName, { var1 as asName1, var2 as asName2 } from 'path';
export interface ImportDeclarationNode extends Node {
    type: NodeType.ImportDeclaration;
    readonly path: string;
    readonly pathPos: Position;
    readonly vars: ImportSepcifier[];
}

export interface CommentNode extends Node {
    type: NodeType.Comment,
    value: string;
}

export interface VarDeclarationNode extends Node {
    type: NodeType.VarDeclaration,
    name: VarNames,
}

export interface VarStatementNode extends MultiNode {
    readonly type: NodeType.VarStatement,
    readonly items: VarDeclarationNode[],
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

export type CssBlockItemNode = CssDeclarationNode | IgnoreNode | CssMediaNode | CssBlockNode;
export interface CssBlockNode extends Node {
    type: NodeType.CssBlock,
    readonly selectors: CssSelectorNode[],
    readonly items: CssBlockItemNode[],
}

export type JssBlockItemNode = CssDeclarationNode | JssDeclarationNode
    | IgnoreNode | JssBlockNode | JssSpreadNode
    | JsRawNode | JssVarDeclarationNode | JssAtRuleNode | JssSupportsNode;

export interface JssBlockNode extends Node, SourceMappedNode {
    type: NodeType.JssBlock,
    readonly selectors: JssSelectorNode[],
    readonly items: JssBlockItemNode[],
}

export interface CssImportNode extends Node, SourceMappedNode {
    type: NodeType.CssImport,
    readonly path: string,
}

export interface CssRawNode extends Node, SourceMappedNode {
    type: NodeType.CssRaw,
    readonly value: string,
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

export interface SourceMappedNode {
    readonly position: Position;
}

export interface JsRawNode extends Node, SourceMappedNode {
    readonly type: NodeType.Raw,
    readonly value: string;
}

export interface CssMediaNode extends Node, SourceMappedNode {
    readonly type: NodeType.CssMedia,
    readonly mediaList: string[],
    readonly items: CssBlockItemNode[],
}

export interface CssPageNode extends Node, SourceMappedNode {
    readonly type: NodeType.CssPage,
    readonly pageSelectors: string[],
    readonly items: (CssDeclarationNode | IgnoreNode)[],
}

export interface JssPageNode extends Node, SourceMappedNode {
    readonly type: NodeType.JssPage,
    readonly pageSelectors: string[],
    readonly items: JssBlockItemNode[],
}

export interface JssAtRuleNode extends Node, SourceMappedNode {
    readonly type: NodeType.JssAtRule,
    readonly name: string;
    readonly mediaList: string[],
    readonly items: JssBlockItemNode[],
}

export interface JssSupportsNode extends Node, SourceMappedNode {
    readonly type: NodeType.JssSupports,
    readonly query: string,
    readonly items: JssBlockItemNode[],
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

export interface FontFaceNode extends Node, SourceMappedNode {
    readonly type: NodeType.CssFontFace,
    readonly items: JssBlockItemNode[],
}

export interface ErrorNode extends Node, SourceMappedNode {
    readonly type: NodeType.Error,
    readonly errorMessage: string,
    readonly exception: Error,
    readonly parserName: string,
}

export interface ClassDeclarationNode extends Node {
    readonly type: NodeType.ClassDeclaration,
    readonly name? : LiteralToken;
}

export interface FunctionEpressionNode extends Node {
    readonly type: NodeType.FunctionExpression;
    readonly name? : LiteralToken;
}

export interface AsyncFunctionEpressionNode extends Node {
    readonly type: NodeType.AsyncFunctionExpression;
    readonly name? : LiteralToken;
}

export interface GeneratorEpressionNode extends Node {
    readonly type: NodeType.GeneratorExpression;
    readonly name? : LiteralToken;
}

export interface AsyncGeneratorEpressionNode extends Node {
    readonly type: NodeType.AsyncGeneratorExpression;
    readonly name? : LiteralToken;
}

export interface ExportDeclarationNode extends Node {
    readonly type: NodeType.ExportDeclaration,
    readonly value: ExportDeclarationValue;
}

export interface AssignmentExpressionNode extends Node {
    readonly type: NodeType.AssignmentExpression,
}
