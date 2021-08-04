export type Token = SpaceToken | CommentToken |
    MultilineCommentToken | BlockToken |
    LiteralToken | LazyBlockToken |
    CommaToken | StringToken |
    SymbolToken | TemplateStringToken |
    RoundBracketsToken | SquareBracketsToken |
    SemicolonToken;

export enum TokenType {
    Space,
    Comment,
    MultilineComment,
    Block,
    LazyBlock,
    Literal,
    Comma,
    String,
    Symbol,
    TemplateString,
    RoundBrackets,
    SquareBrackets,
    Semicolon,
}

interface IBaseToken {
    type: TokenType;
}

export interface SpaceToken extends IBaseToken {
    type: TokenType.Space;
    readonly value: string;
}

export interface CommentToken extends IBaseToken {
    type: TokenType.Comment;
    readonly value: string;
}

export interface MultilineCommentToken extends IBaseToken {
    type: TokenType.MultilineComment,
    readonly value: string;
}

export interface BlockToken extends IBaseToken {
    type: TokenType.Block;
    readonly items: Token[];
}

export interface LazyBlockToken extends IBaseToken {
    type: TokenType.LazyBlock;
    readonly value: string;
}

export interface LiteralToken extends IBaseToken {
    type: TokenType.Literal;
    readonly value: string;
}

export interface CommaToken extends IBaseToken {
    type: TokenType.Comma
}

export interface StringToken extends IBaseToken {
    type: TokenType.String;
    readonly value: string;
}

export interface SymbolToken extends IBaseToken {
    type: TokenType.Symbol;
    readonly value: string;
}

export interface TemplateStringToken extends IBaseToken {
    type: TokenType.TemplateString;
    readonly value: string;
}

export interface RoundBracketsToken extends IBaseToken {
    type: TokenType.RoundBrackets,
    readonly value: string;
}

export interface SquareBracketsToken extends IBaseToken {
    type: TokenType.SquareBrackets,
    readonly value: string;
}

export interface SemicolonToken extends IBaseToken {
    type: TokenType.Semicolon;
}
