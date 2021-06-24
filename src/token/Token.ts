export type Token = SpaceToken | CommentToken | BlockToken;

interface SpaceToken {
    type = 'space';
    readonly value: string;
}

interface CommentToken {
    type = 'comment';
    readonly value: string;
}

interface BlockToken {
    type = 'block';
    readonly items: Token[];
}
