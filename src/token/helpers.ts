import { CommaToken, LazyBlockToken, LiteralToken, RoundBracketsToken, SpaceToken, SquareBracketsToken, StringToken, SymbolToken, TokenType } from "./Token";

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

export function makeSquareBracketsToken(value: string): SquareBracketsToken {
    return {
        type: TokenType.SquareBrackets,
        value,
    }
}

export function makeCommaToken(value: string = ','): CommaToken {
    return {
        type: TokenType.Comma,
        value,
    };
}
