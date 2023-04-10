import { blockReader, literalReader, makeBracketsReader, makeStringReader, makeSymbolReader, spaceReader, templateStringReader, unexpectedReader } from 'lexer/reader/readers';
import { InputStream } from 'stream/input';
import { Token } from 'token/Token';
import { BasicLexer } from './BasicLexer';
import { commentReader, cssCommentReader } from './reader/comments';

const lexer = new BasicLexer([
    spaceReader,
    cssCommentReader, // it's in coflit with makeSymbol, so we put it first
    makeSymbolReader(),
    literalReader,
    blockReader,
    commentReader,
    makeStringReader("'"),
    makeStringReader('"'),
    templateStringReader,
    makeBracketsReader('(', ')'),
    makeBracketsReader('[', ']'),

    // keep it always in the end
    unexpectedReader,
]);

export function jssLexer(stream: InputStream) : Token[] {
    return lexer.parse(stream);
}
