import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeLiteralToken, makeSymbolToken } from "token/helpers";
import { lexerMarkdown } from "./markdownLexer";

const anySpace = () => { return {type: TokenType.Space, value: expect.anything(), position: expect.anything()} };

describe('markdownLexer()', () => {
    it('parses markdown', () => {
        expect(lexerMarkdown(new StringInputStream(`# Header

Hello world!

\`\`\`js
alert(1);
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
    makeLiteralToken('alert'), makeSymbolToken('('), makeLiteralToken('1'), makeSymbolToken(')'), makeSymbolToken(';'),
    anySpace(),
    makeSymbolToken('`'), makeSymbolToken('`'), makeSymbolToken('`'),
    anySpace(),
]);
    })
});
