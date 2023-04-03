import { Position } from 'stream/position';
import { OneOfBlockToken } from 'token';
import { InputStream } from './InputStream';
import { StringInputStream } from './StringInputStream';

export class SubStringInputStream extends StringInputStream implements InputStream {
    constructor(input: string, startPos : Position) {
        super(input, startPos.line, startPos.col);
    }

    static fromBlockToken(token : OneOfBlockToken) : InputStream {
        return new SubStringInputStream(
            token.value.slice(1, token.value.length - 1),
            new Position(token.position.line, token.position.col + 1)
        );
    }
}
