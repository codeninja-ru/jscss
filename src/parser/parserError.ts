import { InputStream } from "stream/input";
import { Position } from "stream/position";
import { SpaceToken, Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

function formatError(position : Position, errorMessage : string) : string {
    return `(${position.line}:${position.col}) : ` + errorMessage;
}

const STUB_POSITION = new Position(0, 0);
const stubToken = {type: TokenType.Space,
                   value: '',
                   position: STUB_POSITION} as SpaceToken;

export class ParserError extends Error {
    constructor(message : string, token : Token) {
        super(formatError(token.position, message));
    }

    private static readonly DEFAULT = new ParserError('no', stubToken);

    static reuse(message : string, token : Token) : ParserError {
        this.DEFAULT.message = formatError(token.position, message);

        return this.DEFAULT;
    }
}

export class SyntaxRuleError extends Error {
    constructor(message : string, position : Position) {
        super(formatError(position, message));
    }

    private static readonly DEFAULT = new SyntaxRuleError('', STUB_POSITION);

    static reuse(message : string, position : Position) : SyntaxRuleError {
        this.DEFAULT.message = formatError(position, message);
        return this.DEFAULT;
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
export class SequenceError extends Error {
    public cause: Error;
    constructor(error : ParserError | SyntaxRuleError,
                sequenceIndex : number = 0) {
        // Error.prototype.cause has been avaliable since ecma-262 (2022)
        //super(error.message, {cause: error}); // TODO uncomment if switch to esnext
        super(error.message + ` at index ${sequenceIndex}`);
        this.cause = error;
    }

    private static readonly DEFAULT = new SequenceError(new Error('no'));

    static reuse(error : ParserError | SyntaxRuleError,
                sequenceIndex : number = 0) {
        this.DEFAULT.cause = error;
        this.DEFAULT.message = error.message + ` at index ${sequenceIndex}`;

        return this.DEFAULT;
    }
}

export class EmptyStreamError extends Error {
    constructor(message : string, stream : TokenStream) {
        super(formatError(stream.startStreamPosition, message));
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

export class UnexpectedEndError extends Error {
    static fromStream(stream : TokenStream, message = 'Unexpected end of the stream') : UnexpectedEndError {
        return new UnexpectedEndError(formatError(lastToken(stream).position, message));
    }

    private static DEFAULT = new UnexpectedEndError('no');

    static reuse(stream : TokenStream, message = 'Unexpected end of the stream') {
        this.DEFAULT.message = formatError(lastToken(stream).position, message);
        return this.DEFAULT;
    }
}
