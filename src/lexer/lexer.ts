import { makeCommentReader, makeCssCommentReader } from 'reader/comment';
import { makeBlockReader, makeBracketsReader, makeCommaReader, makeLiteralReader, makeSemicolonReader, makeSpaceReader, makeStringReader, makeSymbolReader, makeTemplateStringReader, makeUnexpectedReader, Reader } from 'reader/readers';
import { InputStream } from 'stream/input';
import { Token } from 'token/Token';

export function lexer(stream: InputStream) : Token[] {
    const tokens: Token[] = [];
    const readers: Array<Reader> = [
        makeSpaceReader(stream),
        makeCommaReader(stream),
        makeSemicolonReader(stream),
        makeCssCommentReader(stream), // it's in coflit with makeSymbol, so we put it first
        makeSymbolReader(stream),
        makeLiteralReader(stream),
        makeBlockReader(stream),
        makeCommentReader(stream),
        makeStringReader(stream, "'"),
        makeStringReader(stream, '"'),
        makeTemplateStringReader(stream),
        makeBracketsReader(stream, '(', ')'),
        makeBracketsReader(stream, '[', ']'),

        // keep it always in the end
        makeUnexpectedReader(stream),
    ];

    while (!stream.isEof()) {
        for (var reader of readers) {
            var token = reader();
            if (token != null) {
                tokens.push(token);
                break;
            }
        }
    }

    return tokens;
}
