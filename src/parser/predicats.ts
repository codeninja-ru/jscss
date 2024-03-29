import { Keyword } from "keywords";
import { Symbols, SyntaxSymbol } from "symbols";
import { LiteralToken, Token, TokenType } from "token";
import { NextToken, ProbeFn } from "./tokenParser";

function containsOnly(str : string, symbol : SyntaxSymbol) : boolean {
    if (str.length == 0) {
        return false;
    }
    for (var i = 0; i < str.length; i++) {
        if (str[i] != symbol.name) {
            return false;
        }
    }

    return true;
}

export function isCssToken(token : Token) : boolean {
    return (token.type == TokenType.Literal && token.value.indexOf('$') == -1)
        || (token.type == TokenType.Symbol && containsOnly(token.value, Symbols.minus));
}

export function isLiteralToken(token : Token) : token is LiteralToken {
    return token.type == TokenType.Literal;
}

export function isLiteralNextToken(nextToken : NextToken) : boolean {
    return isLiteralToken(nextToken.token);
}

export function makeIsKeywordNextTokenProbe(keyword : Keyword) : ProbeFn {
    return (nextToken : NextToken) : boolean => {
        return nextToken.token.type == TokenType.Literal
            && keyword.equal(nextToken.token);
    };
}

export function isStringNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.String;
}

export function isRoundBracketNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.RoundBrackets;
}

export function isSquareBracketNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.SquareBrackets;
}

export function isSymbolNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.Symbol;
}

export function makeIsSymbolNextTokenProbe(symbol : SyntaxSymbol) : ProbeFn {
    return (nextToken : NextToken) : boolean => {
        return symbol.equal(nextToken.token);
    };
}

export function isLazyBlockNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.LazyBlock;
}

export function makeIsTokenTypeNextTokenProbe(tokenType : TokenType) : ProbeFn {
    return (nextToken : NextToken) : boolean => {
        return nextToken.token.type == tokenType;
    }
}
