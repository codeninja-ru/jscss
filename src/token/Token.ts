import { Position } from "stream/position";

export type ExtractType<T> = T extends BaseToken ? T["type"] : never;

export type Token = SpaceToken | CommentToken |
    MultilineCommentToken | BlockToken |
    LiteralToken | LazyBlockToken | StringToken |
    SymbolToken | TemplateStringToken |
    RoundBracketsToken | SquareBracketsToken;

export type OneOfBlockToken = BlockToken | LazyBlockToken | RoundBracketsToken
    | SquareBracketsToken;

export enum TokenType {
    Space,
    Comment,
    MultilineComment,
    Block,
    LazyBlock,
    Literal,
    String,
    Symbol,
    TemplateString,
    RoundBrackets,
    SquareBrackets,
    HiddenToken, // Hidden token for internal operation
}

export interface WithPosition {
    readonly position: Position;
}

export function isToken(obj : any) : obj is BaseToken {
    return obj !== undefined && obj.type !== undefined && obj.position != undefined && obj.value != undefined;
}

export interface BaseToken extends WithPosition {
    readonly type: TokenType;
    value: string;
}

export interface SpaceToken extends BaseToken {
    type: TokenType.Space;
    readonly value: string;
}

export interface CommentToken extends BaseToken {
    type: TokenType.Comment;
    readonly value: string;
}

export interface MultilineCommentToken extends BaseToken { //TODO merge with comment
    type: TokenType.MultilineComment,
    readonly value: string;
}

export interface BlockToken extends BaseToken {
    type: TokenType.Block;
    readonly items: Token[];
    readonly value: string;
}

export interface LazyBlockToken extends BaseToken { //TODO merge with block
    type: TokenType.LazyBlock;
    readonly value: string;
}

export interface LiteralToken extends BaseToken {
    type: TokenType.Literal;
    readonly value: string;
}

export interface StringToken extends BaseToken {
    type: TokenType.String;
    readonly value: string;
}

export interface SymbolToken extends BaseToken {
    type: TokenType.Symbol;
    readonly value: string;
}

export interface TemplateStringToken extends BaseToken {
    type: TokenType.TemplateString;
    readonly value: string;
}

export interface RoundBracketsToken extends BaseToken {
    type: TokenType.RoundBrackets,
    readonly value: string;
}

export interface SquareBracketsToken extends BaseToken {
    type: TokenType.SquareBrackets,
    readonly value: string;
}

export interface HiddenToken extends BaseToken {
    type: TokenType.HiddenToken;
    readonly value: string;
}
