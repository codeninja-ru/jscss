import { Position } from "stream/position";
import { Token, TokenType } from "token";
import { TokenStream } from "./tokenStream";

export type TokenStreamReader = (stream: TokenStream) => Token;

export function isSpace(token : Token) : boolean {
    return token.type == TokenType.Space;
}

export function isComment(token : Token) : boolean {
    switch(token.type) {
        case TokenType.Comment:
        case TokenType.MultilineComment:
        case TokenType.CssComment:
            return true;
        default:
            return false;
    }
}

export function isSpaceOrComment(token : Token) : boolean {
    switch(token.type) {
        case TokenType.Space:
        case TokenType.Comment:
        case TokenType.MultilineComment:
        case TokenType.CssComment:
            return true;
        default:
            return false;
    }
}

export function peekNextToken(stream : TokenStream) : Token {
    if (stream.eof()) {
        throw new Error(`end of the file`);
    }

    return stream.next();
}

export function positionOfNextToken(stream : TokenStream) : Position {
    for (let pos = stream.currentPosition(); pos < stream.length(); pos++) {
        const token = stream.take(pos++);
        if (isSpaceOrComment(token)) {
            continue;
        } else {
            return token.position;
        }
    }

    throw new Error(`end of the file`);
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

    throw new Error(`end of the file`);
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

    throw new Error(`end of the file`);
};
