import { InputStream } from 'stream/input';
import { Token } from 'token/Token';
import { AbstractLexer } from './AbstractLexer';
import { literalReader, spaceReader, unexpectedReader, makeSymbolReader, makeStringReader } from './reader/readers';

class ArgLexer extends AbstractLexer {
    protected readers = [
        spaceReader,
        makeSymbolReader("-/\\.:"),
        literalReader,
        makeStringReader("'"),
        makeStringReader('"'),

        // keep it always in the end
        unexpectedReader,
    ];
}

const lexer = new ArgLexer();

export function argLexer(stream : InputStream) : Token[] {
    return lexer.parse(stream);
}
