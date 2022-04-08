import { Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

export type TokenStreamReader = (stream: TokenStream) => Token;

export function peekNextToken(stream : TokenStream) : Token {
    if (stream.eof()) {
        throw new Error(`end of the file`);
    }

    return stream.next();
}

export function peekAndSkipSpaces(stream: TokenStream) : Token {
    while (!stream.eof()) {
        const token = stream.next();
        switch(token.type) {
            case TokenType.Space:
            case TokenType.Comment:
            case TokenType.MultilineComment:
                continue;
            default:
                return token;
        }
    }

    throw new Error(`end of the file`);
}

export function peekNoLineTerminatorHere(stream: TokenStream) : Token {
    while (!stream.eof()) {
        const token = stream.next();
        switch(token.type) {
            case TokenType.Comment:
            case TokenType.MultilineComment:
                continue;
            case TokenType.Space:
                if (token.value.indexOf("\n") != -1) {
                    throw new Error('no line terminator here')
                }
                continue;
            default:
                return token;
        }
    }

    throw new Error(`end of the file`);
};
