import { OneOfBlockToken } from 'token';
import { InputStream } from './InputStream';
import { StringInputStream } from './StringInputStream';

export class SubStringInputStream {
    static fromBlockToken(token : OneOfBlockToken) : InputStream {
        if (token.value.length == 0) {
            throw new Error('invalid block token');
        }
        return new StringInputStream(
            token.value.slice(1, token.value.length - 1),
            token.position.line, token.position.col + 1
        );
    }
}
