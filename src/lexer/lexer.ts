import { blockReader, literalReader, makeBracketsReader, makeStringReader, makeSymbolReader, spaceReader, templateStringReader, unexpectedReader } from 'lexer/reader/readers';
import { InputStream } from 'stream/input';
import { Token } from 'token/Token';
import { AbstractLexer } from './AbstractLexer';
import { commentReader, cssCommentReader } from './reader/comments';

class JssLexer extends AbstractLexer {
    protected readers = [
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
    ];
}

const jssLexer = new JssLexer();

export function lexer(stream: InputStream) : Token[] {
    return jssLexer.parse(stream);
}
