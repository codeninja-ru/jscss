import { InputStream } from 'stream/input';
import { Token } from 'token/Token';
import { AbstractLexer } from './AbstractLexer';
import { commentReader, cssCommentReader } from './reader/comments';
import { blockReader, commaReader, literalReader, makeBracketsReader, makeStringReader, makeSymbolReader, semicolonReader, spaceReader, templateStringReader, unexpectedReader } from 'lexer/reader/readers';

class JssLexer extends AbstractLexer {
    protected readers = [
        spaceReader,
        commaReader,
        semicolonReader,
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
