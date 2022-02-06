import { LiteralToken, StringToken, TokenType } from "./Token";

export function makeLiteralToken(value: string): LiteralToken  {
    return {
        type: TokenType.Literal,
        value,
        rawValue: value,
    };
}

export function makeStringToken(value: string): StringToken {
    return {
        type: TokenType.String,
        value,
        rawValue: value,
    }
}
