import { SingleSymbol, Symbols, SyntaxSymbol } from "symbols";
import { LiteralToken, Token, TokenType } from "token";
import { NextToken, ProbeFn } from "./tokenParser";

// TODO convert $ to symbol?
export function is$Token(token : Token) : token is LiteralToken {
   return token.type == TokenType.Literal && token.value == '$';
}

export function is$NextToken(nextToken : NextToken) : boolean {
    return nextToken.exists && is$Token(nextToken.token);
}

function containsOnly(str : string, symbol : SyntaxSymbol) : boolean {
    if (str.length == 0) {
        return false;
    }
    for (const ch of str) {
        if (ch != symbol.name) {
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

export function isStringNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.String;
}

export function isRoundBracketNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.RoundBrackets;
}

export function isSymbolNextToken(nextToken : NextToken) : boolean {
    return nextToken.token.type == TokenType.Symbol;
}

export function makeIsSymbolNextTokenProbe(symbol : SingleSymbol) : ProbeFn {
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
