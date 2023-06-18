import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeLiteralToken, makeSymbolToken } from "token/helpers";
import { lexerMarkdown } from "./markdownLexer";

const anySpace = () => { return {type: TokenType.Space, value: expect.anything(), position: expect.anything()} };

describe('markdownLexer()', () => {
    it('parses markdown', () => {
        expect(lexerMarkdown(new StringInputStream(`# Header

Hello world!

\`\`\`js title='hi'
alert("1");
\`\`\`
`))).toEqual([
    makeSymbolToken('#'), anySpace(),
    makeLiteralToken('Header'),
    anySpace(),
    makeLiteralToken('Hello'), anySpace(), makeLiteralToken('world'), makeSymbolToken('!'),
    anySpace(),
    makeSymbolToken('`'), makeSymbolToken('`'), makeSymbolToken('`'),
    makeLiteralToken('js'),
    anySpace(),
    makeLiteralToken('title'), makeSymbolToken('='), makeSymbolToken("'"), makeLiteralToken('hi'), makeSymbolToken("'"),
    anySpace(),
    makeLiteralToken('alert'), makeSymbolToken('('), makeSymbolToken('"'), makeLiteralToken('1'), makeSymbolToken('"'), makeSymbolToken(')'), makeSymbolToken(';'),
    anySpace(),
    makeSymbolToken('`'), makeSymbolToken('`'), makeSymbolToken('`'),
    anySpace(),
]);
    })
});
