import { Token } from "token";

export interface TokenStream {
    take(idx: number): Token;
    takeNext(): Token;
    next(): Token;
    movePosition(newPos: number): void;
    eof(): boolean;
    currentPosition(): number;
    length(): number;
    formatError(message : string) : Error;
};

function sprintPos(token : Token) : string {
    return `(${token.position.line}:${token.position.col})`;
}

function formatError(stream : TokenStream, errorMessage : string) : Error {
    return new Error (`${sprintPos(stream.takeNext())} : ` + errorMessage);
}

export interface ChildTokenStream extends TokenStream {
    flush() : void;
    rawValue() : string;
}

export class ArrayTokenStream implements TokenStream {
    private pos : number = 0;
    constructor(private tokens : Token[]) {
    }

    take(idx: number): Token {
        return this.tokens[idx];
    }

    next(): Token {
        return this.tokens[this.pos++];
    }

    takeNext() : Token {
        return this.tokens[this.pos];
    }

    movePosition(newPos: number): void {
        this.pos = newPos;
    }

    currentPosition() : number {
        return this.pos;
    }

    eof() : boolean {
        return this.tokens.length <= this.pos;
    }

    length() : number {
        return this.tokens.length;
    }

    formatError(message : string) : Error {
        return formatError(this, message);
    }
}

export class CommonChildTokenStream implements ChildTokenStream {
    private pos : number;
    private startPos : number;
    constructor(private parent: TokenStream) {
        this.pos = parent.currentPosition();
        this.startPos = parent.currentPosition();
    }

    next() : Token {
        return this.take(this.pos++);
    }

    take(idx: number) : Token {
        return this.parent.take(idx);
    }

    takeNext() : Token {
        return this.parent.take(this.pos);
    }

    movePosition(idx: number) {
        this.pos = idx;
    }

    eof() : boolean {
        return this.parent.length() <= this.pos;
    }

    rawValue() : string {
        let result = '';
        for (let i = this.startPos; i < this.pos; i++) {
            result += this.parent.take(i).value;
        }

        return result;
    }

    flush() {
        this.parent.movePosition(this.pos);
    }

    currentPosition() {
        return this.pos;
    }

    length() : number {
        return this.parent.length();
    }

    formatError(message : string) : Error {
        return this.parent.formatError(message);
    }

}
