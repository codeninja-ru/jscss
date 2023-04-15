import { blockReader, literalReader, makeBracketsReader, makeStringReader, makeSymbolReader, simpleRoundBracketsReader, spaceReader, templateStringReader, unexpectedReader } from 'lexer/reader/readers';
import { InputStream } from 'stream/input';
import { Token, TokenType } from 'token/Token';
import { commentReader } from './reader/comments';

class Lexer {
    private readonly readers = [
        spaceReader,
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

    // NOTE: url cannot be parsed with makeBracketsReader since in can be a badurl
    private parseBadUrl(stream : InputStream) : Token | null {
        if (!stream.isEof()) {
            return simpleRoundBracketsReader(stream);
        }

        return null;
    }

    parse(stream : InputStream) : Token[] {
        const tokens: Token[] = [];
        while (!stream.isEof()) {
            for (var i = 0; i < this.readers.length; i++) {
                var token = this.readers[i](stream);
                if (token != null) {
                    tokens.push(token);
                    if (token.type == TokenType.Literal
                        && token.value.toLowerCase() == 'url') {
                        const urlToken = this.parseBadUrl(stream);
                        if (urlToken != null) {
                            tokens.push(urlToken);
                        }
                    }
                    break;
                }
            }
        }

        return tokens;
    }
}

const lexer = new Lexer();

export function jssLexer(stream: InputStream) : Token[] {
    return lexer.parse(stream);
}
