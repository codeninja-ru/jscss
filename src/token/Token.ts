export type Token = SpaceToken | CommentToken | BlockToken | LiteralToken;

interface SpaceToken {
    type: 'space';
    readonly value: string;
}

interface CommentToken {
    type: 'comment';
    readonly value: string;
}

interface BlockToken {
    type: 'block';
    readonly items: Token[];
}

interface LiteralToken {
    type: 'literal';
    readonly value: string;
}
