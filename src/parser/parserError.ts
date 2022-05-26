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
