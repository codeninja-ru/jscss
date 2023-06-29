import { InputStream } from "stream/input";
import { Position } from "stream/position";
import { Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

function formatError(position : Position, errorMessage : string) : string {
    return `(${position.line}:${position.col}) : ` + errorMessage;
}

const STUB_POSITION = new Position(0, 0);

export interface ErrorMessage {
    readonly message : string;
}

export class ParserError implements ErrorMessage {
    constructor(private readonly _message : string,
                private readonly token : Token) {
    }

    get message() : string {
        return formatError(this.token.position, this._message);
    }

    static reuse(message : string, token : Token) : ParserError {
        return new ParserError(message, token);
    }
}

export class SyntaxRuleError implements ErrorMessage {
    constructor(private readonly _message : string,
                private readonly position : Position) {
    }

    get message() : string {
        return formatError(this.position, this._message);
    }

    static reuse(message : string, position : Position) : SyntaxRuleError {
        return new SyntaxRuleError(message, position);
    }
}

export class LexerError extends Error {
    constructor(message : string, stream : InputStream) {
        super(formatError(stream.position(), message));
    }
}

/**
 * this error indicates that this error should be hight priority
 * somethime there is an error insede a block (round brackets for example),
 * while parsing such block it's handy to see the error thrown from the block rather than see message that the whole block rule is invalid
 * */
export class BlockParserError extends Error {
    constructor(error : ParserError) {
        // @ts-ignore
        super(error.message, {cause: error});
    }
}

/**
 * error in the middle of the sequence
 * */
export class SequenceError implements ErrorMessage {
    constructor(public readonly cause : ErrorMessage,
                private readonly sequenceIndex : number = 0) {
    }

    get message() : string {
        return this.cause.message + ` at index ${this.sequenceIndex}`;
    }

    static reuse(error : ErrorMessage,
                sequenceIndex : number = 0) {
        return new SequenceError(error, sequenceIndex);
    }
}

export class EmptyStreamError implements ErrorMessage {
    constructor(private readonly _message : string,
                private readonly stream : TokenStream) {
    }

    get message() : string {
        return formatError(this.stream.startStreamPosition, this._message);
    }
}

function lastToken(stream : TokenStream) : Token {
    if (stream.length() > 0) {
        return stream.take(stream.length() - 1);
    } else {
        return { // NOTE a stub comment for empty stream
            type: TokenType.Space,
            value: '',
            position: STUB_POSITION,
        };
    }
}

export class UnexpectedEndError implements ErrorMessage {
    constructor(private readonly stream : TokenStream,
                private readonly _message = 'Unexpected end of the stream') {

    }

    get message() : string {
        return formatError(lastToken(this.stream).position, this._message);
    }

    static reuse(stream : TokenStream, message = 'Unexpected end of the stream') {
        return new UnexpectedEndError(stream, message);
    }
}
