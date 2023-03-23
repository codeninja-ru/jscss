import { StringInputStream } from "stream/input";
import { Position } from "stream/position";
import { Token } from "token";
import { lexer } from "lexer/lexer";
import { ArraySourceFragment, SourceFragment } from "./sourceFragment";

// TODO free method to safe mem?
export interface TokenStream {
    take(idx: number): Token;
    peek(): Token;
    next(): Token;
    movePosition(newPos: number): void;
    eof(): boolean;
    currentPosition(): number;
    length(): number;
    readonly startStreamPosition: Position;
};

export interface FlushableTokenStream extends TokenStream {
    flush() : void;
    sourceFragment(fromPos? : number) : SourceFragment;
    currentTokenPosition() : Position;
}

const ZERO_POSITION = {
    line: 1,
    col: 1,
} as Position;

export class ArrayTokenStream implements TokenStream {
    private pos : number = 0;
    readonly startStreamPosition: Position;

    static fromString(str : string) : TokenStream {
        return new ArrayTokenStream(lexer(new StringInputStream(str)));
    }

    constructor(private tokens : Token[], startStreamPosition = ZERO_POSITION) {
        this.startStreamPosition = startStreamPosition;
    }

    take(idx: number): Token {
        return this.tokens[idx];
    }

    next(): Token {
        return this.tokens[this.pos++];
    }

    peek() : Token {
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
}

export class LookAheadTokenStream implements FlushableTokenStream {
    private pos : number;
    private startPos : number;
    readonly startStreamPosition: Position;

    constructor(private parent: (TokenStream | FlushableTokenStream)) {
        this.pos = parent.currentPosition();
        this.startPos = parent.currentPosition();
        this.startStreamPosition = parent.startStreamPosition;
    }

    next() : Token {
        return this.take(this.pos++);
    }

    take(idx: number) : Token {
        return this.parent.take(idx);
    }

    peek() : Token {
        return this.parent.take(this.pos);
    }

    movePosition(idx: number) {
        this.pos = idx;
    }

    eof() : boolean {
        return this.parent.length() <= this.pos;
    }

    currentTokenPosition() : Position {
        return this.parent.take(this.pos).position;
    }

    sourceFragment(fromPos? : number) : SourceFragment {
        const tokens = [];
        for (let i = fromPos ? fromPos : this.startPos; i < this.pos; i++) {
            tokens.push(this.parent.take(i));
        }

        return new ArraySourceFragment(tokens);
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
}
