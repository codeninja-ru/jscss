import { Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

function formatError(token : Token, errorMessage : string) : string {
    return `(${token.position.line}:${token.position.col}) : ` + errorMessage;
}

export class ParserError extends Error {
    constructor(message : string, token : Token) {
        super(formatError(token, message));
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
    constructor(stream : TokenStream) {
        super(formatError(lastToken(stream), 'Unexpected end of the stream'));
    }
}
