export type Token = SpaceToken | CommentToken | BlockToken;

interface SpaceToken {
    type: string = 'space';
    readonly value: string;
}

interface CommentToken {
    type: string = 'comment';
    readonly value: string;
}

interface BlockToken {
    type: string = 'block';
    readonly items: Token[];
}
