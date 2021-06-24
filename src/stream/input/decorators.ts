import { InputStream } from './InputStream';
import { AbstractInputStreamDecorator } from './AbstractInputStreamDecorator';

export function readToEnd(input: InputStream): string {
    var result = '';
    while (!input.isEof()) {
        result += input.next();
    }

    return result;
}

export class TillEndOfLineStream extends AbstractInputStreamDecorator implements InputStream {
    isEof(): boolean {
        return this.stream.isEof() || this.stream.peek() == "\n";
    }
}

export class KindOfSpaceInputStream extends AbstractInputStreamDecorator implements InputStream {
    static isKindOfSpace(ch: Char) {
        return ch.charCodeAt(0) <= 32;
    }

    isEof(): boolean {
        return this.stream.isEof() || !KindOfSpaceInputStream.isKindOfSpace(this.stream.peek());
    }
}
