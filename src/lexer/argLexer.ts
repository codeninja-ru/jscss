import { makeLiteralReader, makeSpaceReader, makeStringReader, makeSymbolReader, makeUnexpectedReader, Reader } from 'reader/readers';
import { InputStream } from 'stream/input';
import { StringOutputStream } from 'stream/output';
import { Token } from 'token/Token';

export function argLexer(stream : InputStream) : Token[] {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    const readers: Array<Reader> = [
        makeSpaceReader(stream),
        makeSymbolReader(stream, "-/\\.:"),
        makeLiteralReader(stream),
        makeStringReader(stream, "'"),
        makeStringReader(stream, '"'),

        // keep it always in the end
        makeUnexpectedReader(stream),
    ];

    try {
        while (!stream.isEof()) {
            for (var reader of readers) {
                var token = reader();
                if (token) {
                    tokens.push(token);
                    break;
                }
            }
        }
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        out.close();
    }

    return tokens;
}
