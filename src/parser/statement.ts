import { Token, TokenType } from 'token';

export type IStatement = Array<Token>;

export class Statement extends Array<Token> {
    [idx: number]: Token;

    firstLiteral(): string | null {
        for (var token of this) {
            if (token.type == TokenType.Space) {
                continue;
            }

            if (token.type == TokenType.Literal) {
                return token.value;
            } else {
                return null;
            }

        }

        return null;
    }
}
