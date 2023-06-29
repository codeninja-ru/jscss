import { Token, TokenType } from "token";
import { UnexpectedEndError } from "./parserError";
import { TokenStream } from "./tokenStream";

export type TokenStreamReader = (stream: TokenStream) => Token;

export function isSpace(token : Token) : boolean {
    return token.type == TokenType.Space;
}

//TODO why is it here?
export function isComment(token : Token) : boolean {
    switch(token.type) {
        case TokenType.Comment:
        case TokenType.MultilineComment:
            return true;
        default:
            return false;
    }
}

//TODO why is it here?
export function isSpaceOrComment(token : Token) : boolean {
    switch(token.type) {
        case TokenType.Space:
        case TokenType.Comment:
        case TokenType.MultilineComment:
            return true;
        default:
            return false;
    }
}

export function peekNextToken(stream : TokenStream) : Token {
    if (stream.eof()) {
        throw UnexpectedEndError.reuse(stream);
    }

    return stream.next();
}

export function peekAndSkipSpaces(stream: TokenStream) : Token {
    while (!stream.eof()) {
        const token = stream.next();
        if (isSpaceOrComment(token)) {
            continue;
        } else {
            return token;
        }
    }

    throw UnexpectedEndError.reuse(stream);
}

export function peekNoLineTerminatorHere(stream: TokenStream) : Token {
    while (!stream.eof()) {
        const token = stream.next();
        if (isComment(token)) {
            continue;
        } else if (isSpace(token)) {
            if (token.value.indexOf("\n") != -1) {
                throw new Error('no line terminator here')
            }
            continue;
        } else {
            return token;
        }
    }

    throw UnexpectedEndError.reuse(stream);
};
