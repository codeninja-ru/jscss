import { CommaToken, LazyBlockToken, LiteralToken, RoundBracketsToken, SemicolonToken, SpaceToken, StringToken, SymbolToken, TokenType } from "./Token";

export function makeLiteralToken(value: string): LiteralToken  {
    return {
        type: TokenType.Literal,
        value,
    };
}

export function makeStringToken(value: string): StringToken {
    return {
        type: TokenType.String,
        value,
    }
}

export function makeSpaceToken(value: string = ' '): SpaceToken {
    return {
        type: TokenType.Space,
        value,
    };
}

export function makeSemicolonToken(): SemicolonToken {
    return {
        type: TokenType.Semicolon,
        value: ';',
    }
}

export function makeLazyBlockToken(value: string): LazyBlockToken {
    return {
        type: TokenType.LazyBlock,
        value,
    }
}

export function makeSymbolToken(value: string): SymbolToken {
    return {
        type: TokenType.Symbol,
        value,
    }
}

export function makeRoundBracketsToken(value: string): RoundBracketsToken {
    return {
        type: TokenType.RoundBrackets,
        value,
    }
}

export function makeCommaToken(value: string = ','): CommaToken {
    return {
        type: TokenType.Comma,
        value,
    };
}
