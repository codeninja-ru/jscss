import { Reader } from 'lexer/reader/readers';
import { InputStream } from 'stream/input';
import { Token } from 'token/Token';

export abstract class AbstractLexer {
    protected abstract readers : Reader[];

    parse(stream : InputStream) : Token[] {
        const tokens: Token[] = [];
        while (!stream.isEof()) {
            for (var i = 0; i < this.readers.length; i++) {
                var token = this.readers[i](stream);
                if (token != null) {
                    tokens.push(token);
                    break;
                }
            }
        }

        return tokens;
    }
}
