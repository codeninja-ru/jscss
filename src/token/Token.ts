export type Token = SpaceToken | CommentToken |
    MultilineCommentToken | BlockToken |
    LiteralToken | LazyBlockToken |
    CommaToken | StringToken |
    SymbolToken | TemplateStringToken |
    RoundBracketsToken | SquareBracketsToken |
    SlashBracketsToken;

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
    SlashBrackets,
}

interface BaseToken {
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

export interface CommaToken extends BaseToken {
    type: TokenType.Comma
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

export interface SlashBracketsToken extends BaseToken {
    type: TokenType.SlashBrackets,
    readonly value: string;
}
