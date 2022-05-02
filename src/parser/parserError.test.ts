import { LiteralToken, TokenType } from "token";
import { ParserError } from './parserError';

describe('class ParserError', () => {
    test('test error message', () => {
        const token = {
            type: TokenType.Literal,
            value: 'test',
            position: {
                line: 3,
                col: 4,
            }
        } as LiteralToken;
        expect(() => {
            throw new ParserError("Error message", token);
        }).toThrowError("(3:4) : Error message");
    });

});
