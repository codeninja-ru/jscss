import { InputStream } from 'stream/input';
import { Token } from 'token/Token';
import { BasicLexer } from './BasicLexer';
import { literalReader, spaceReader, unexpectedReader, makeSymbolReader, makeStringReader } from './reader/readers';

const lexer = new BasicLexer([
    spaceReader,
    makeSymbolReader("-/\\.:"),
    literalReader,
    makeStringReader("'"),
    makeStringReader('"'),

    // keep it always in the end
    unexpectedReader,
]);

export function argLexer(stream : InputStream) : Token[] {
    return lexer.parse(stream);
}
