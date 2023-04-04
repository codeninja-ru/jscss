import { literalReader, Reader, spaceReader, unexpectedReader } from 'lexer/reader/readers';
import { InputStream } from 'stream/input/InputStream';
import { SymbolToken, Token, TokenType } from 'token/Token';
import { AbstractLexer } from './AbstractLexer';
import { ReaderResult } from './reader/readers';

export function makeSymbolRegReader(reg = /[^\s\w]/) : Reader {
    return function(stream: InputStream) : ReaderResult {
        var ch = stream.peek();
        if (reg.test(ch)) {
            const pos = stream.position();
            stream.next();
            return {
                type: TokenType.Symbol,
                position: pos,
                value: ch
            } as SymbolToken;
        }

        return null;
    };
}

class MarkdownLexer extends AbstractLexer {
    protected readers = [
        spaceReader,
        makeSymbolRegReader(),
        literalReader,

        // keep it always in the end
        unexpectedReader,
    ];
}

const lexer = new MarkdownLexer();

export function lexerMarkdown(stream : InputStream) : Token[] {
    return lexer.parse(stream);
}
