import { CommaToken, LazyBlockToken, LiteralToken, RoundBracketsToken, SpaceToken, SquareBracketsToken, StringToken, SymbolToken, TokenType } from "./Token";

export function makeLiteralToken(value: string, pos = expect.anything()): LiteralToken  {
    return {
        type: TokenType.Literal,
        value,
        position: pos,
    };
}

export function makeStringToken(value: string): StringToken {
    return {
        type: TokenType.String,
        value,
        position: expect.anything(),
    }
}

export function makeSpaceToken(value: string = ' '): SpaceToken {
    return {
        type: TokenType.Space,
        position: expect.anything(),
        value,
    };
}

export function makeLazyBlockToken(value: string): LazyBlockToken {
    return {
        type: TokenType.LazyBlock,
        position: expect.anything(),
        value,
    }
}

export function makeSymbolToken(value: string): SymbolToken {
    return {
        type: TokenType.Symbol,
        position: expect.anything(),
        value,
    }
}

export function makeRoundBracketsToken(value: string, pos = expect.anything()): RoundBracketsToken {
    return {
        type: TokenType.RoundBrackets,
        position: pos,
        value,
    }
}

export function makeSquareBracketsToken(value: string): SquareBracketsToken {
    return {
        type: TokenType.SquareBrackets,
        position: expect.anything(),
        value,
    }
}

export function makeCommaToken(value: string = ','): CommaToken {
    return {
        type: TokenType.Comma,
        position: expect.anything(),
        value,
    };
}
