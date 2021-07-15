export type Token = SpaceToken | CommentToken | BlockToken | LiteralToken | LazyBlockToken;

export interface SpaceToken {
    type: 'space';
    readonly value: string;
}

export interface CommentToken {
    type: 'comment';
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
