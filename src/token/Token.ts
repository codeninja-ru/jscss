export type Token = SpaceToken | CommentToken | MultilineCommentToken | BlockToken | LiteralToken | LazyBlockToken | CommaToken | StringToken;

export interface SpaceToken {
    type: 'space';
    readonly value: string;
}

export interface CommentToken {
    type: 'comment';
    readonly value: string;
}

export interface MultilineCommentToken {
    type: 'multiline_comment',
    readonly value: string;
}

export interface BlockToken {
    type: 'block';
    readonly items: Token[];
}

export interface LazyBlockToken {
    type: 'lazy_block';
    readonly value: string;
}

export interface LiteralToken {
    type: 'literal';
    readonly value: string;
}

export interface CommaToken {
    type: 'comma'
}

export interface StringToken {
    type: 'string';
    readonly value: string;
    readonly mark: "'" | '"';
}