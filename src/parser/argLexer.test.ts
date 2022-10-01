import { argLexer } from "argLexer";
import { StringInputStream } from "stream/input";
import { Token, TokenType } from "token";

function getTokens(str : string) : Token[] {
    return argLexer(new StringInputStream(str));
}

describe('argLexer()', () => {
    it('parse arg params', () => {
        expect(getTokens('-h')).toEqual([
            {type: TokenType.Symbol, value: '-', position: expect.anything()},
            {type: TokenType.Literal, value: 'h', position: expect.anything()}
        ]);
        expect(getTokens('--help')).toEqual([
            {type: TokenType.Symbol, value: '-', position: expect.anything()},
            {type: TokenType.Symbol, value: '-', position: expect.anything()},
            {type: TokenType.Literal, value: 'help', position: expect.anything()}
        ]);
        expect(getTokens('-js /tmp/file_name.jss output.css')).toEqual([
            {type: TokenType.Symbol, value: '-', position: expect.anything()},
            {type: TokenType.Literal, value: 'js', position: expect.anything()},
            {type: TokenType.Space, value: ' ', position: expect.anything()},
            {type: TokenType.Symbol, value: '/', position: expect.anything()},
            {type: TokenType.Literal, value: 'tmp', position: expect.anything()},
            {type: TokenType.Symbol, value: '/', position: expect.anything()},
            {type: TokenType.Literal, value: 'file_name', position: expect.anything()},
            {type: TokenType.Symbol, value: '.', position: expect.anything()},
            {type: TokenType.Literal, value: 'jss', position: expect.anything()},
            {type: TokenType.Space, value: ' ', position: expect.anything()},
            {type: TokenType.Literal, value: 'output', position: expect.anything()},
            {type: TokenType.Symbol, value: '.', position: expect.anything()},
            {type: TokenType.Literal, value: 'css', position: expect.anything()},
        ]);
    });

});
