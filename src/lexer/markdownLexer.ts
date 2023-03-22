import { makeLiteralReader, makeSpaceReader, makeUnexpectedReader, Reader } from 'reader/readers';
import { InputStream } from 'stream/input/InputStream';
import { StringOutputStream } from 'stream/output';
import { SymbolToken, Token, TokenType } from 'token/Token';

export function makeSymbolRegReader(stream: InputStream, reg = /[^\s\w]/): Reader {
    return function() {
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

export function markdownLexer(stream : InputStream) : Token[] {
    const out = new StringOutputStream();
    const tokens: Token[] = [];
    const readers: Array<Reader> = [
        makeSpaceReader(stream),
        makeSymbolRegReader(stream),
        makeLiteralReader(stream),

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
