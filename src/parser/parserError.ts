import { Position } from "stream/position";
import { Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

function formatError(position : Position, errorMessage : string) : string {
    return `(${position.line}:${position.col}) : ` + errorMessage;
}

export class ParserError extends Error {
    constructor(message : string, token : Token) {
        super(formatError(token.position, message));
    }
}

export class SyntaxRuleError extends Error {
    constructor(message : string, position : Position) {
        super(formatError(position, message));
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
    constructor(error : ParserError | SyntaxRuleError) {
        // Error.prototype.cause has been avaliable since ecma-262 (2022)
        //super(error.message, {cause: error}); // TODO uncomment if switch to esnext
        super(error.message);
        this.cause = error;
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
            position: {
                col: 0,
                line: 0,
            }
        };
    }
}

export class UnexpectedEndError extends Error {
    constructor(stream : TokenStream, message = 'Unexpected end of the stream') {
        super(formatError(lastToken(stream).position, message));
    }
}
