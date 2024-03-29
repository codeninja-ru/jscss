import { StringInputStream } from "stream/input";
import { Position } from "stream/position";
import { Token } from "token";
import { jssLexer } from "lexer/jssLexer";
import { ArraySourceFragment, SourceFragment } from "./sourceFragment";
import { UnexpectedEndError } from "./parserError";
import fs from 'fs';

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

const ZERO_POSITION = new Position(1, 1);

export class ArrayTokenStream implements TokenStream {
    private pos : number = 0;
    readonly startStreamPosition: Position;

    static fromString(str : string, line = 1, col = 1) : TokenStream {
        return new ArrayTokenStream(jssLexer(new StringInputStream(str, line, col)));
    }

    static fromFile(filePath : string) : TokenStream {
        //return new ArrayTokenStream(lexer(new FileInputStream(filePath)));
        return new ArrayTokenStream(jssLexer(new StringInputStream(fs.readFileSync(filePath).toString())));
    }

    constructor(private tokens : Token[], startStreamPosition = ZERO_POSITION) {
        this.startStreamPosition = startStreamPosition;
    }

    take(idx: number): Token {
        if (idx < this.tokens.length) {
            return this.tokens[idx];
        } else {
            throw UnexpectedEndError.reuse(this);
        }
    }

    next(): Token {
        if (this.pos < this.tokens.length) {
            return this.tokens[this.pos++];
        } else {
            throw UnexpectedEndError.reuse(this);
        }
    }

    peek() : Token {
        if (this.pos < this.tokens.length) {
            return this.tokens[this.pos];
        } else {
            throw UnexpectedEndError.reuse(this);
        }
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
        if (this.startPos >= this.length()) {
            return new ArraySourceFragment(this.parent.take(this.parent.length() - 1).position, []);
        } else {
            const tokens = [];
            const startPos = fromPos ? fromPos : this.startPos;
            //TODO can be optimized with slice
            for (let i = startPos; i < this.pos; i++) {
                tokens.push(this.parent.take(i));
            }

            return new ArraySourceFragment(this.parent.take(startPos).position, tokens);
        }
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
