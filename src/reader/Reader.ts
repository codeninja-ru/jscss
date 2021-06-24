import { InputStream } from 'stream';
import { Token } from 'token/token';

export interface Reader {
    read(stream: InputStream): Token;
}
