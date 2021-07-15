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
    static isKindOfSpace(ch: string) {
        return ch.charCodeAt(0) <= 32;
    }

    isEof(): boolean {
        return this.stream.isEof() || !KindOfSpaceInputStream.isKindOfSpace(this.stream.peek());
    }
}

export class LiteralInputStream extends AbstractInputStreamDecorator implements InputStream {
    static isLiteral(ch: string) {
        return /^[0-9a-zA-Z\.\-\_\#\:]/.test(ch);
    }

    isEof(): boolean {
        return this.stream.isEof() || !LiteralInputStream.isLiteral(this.stream.peek());
    }
}

export class BlockInputStream extends AbstractInputStreamDecorator {
    private level = 0;
    private isFirstSymbol = true;

    constructor(stream: InputStream) {
        super(stream);
        
        if (!BlockInputStream.isBlockStart(this.peek())) {
            throw this.formatError('start of the block is expected');
        }
    }

    static isBlockStart(ch: string) {
        return ch == '{';
    }

    next(): string {
        var ch = super.next();
        this.isFirstSymbol = false;
        if (BlockInputStream.isBlockStart(ch)) {
            this.level++;
        } else if (ch == '}') {
            this.level--;
        }

        if (this.level < 0) {
            throw this.formatError(`curly brackets do not match`);
        }

        return ch;
    }

    isEof(): boolean {
        return this.stream.isEof() || (!this.isFirstSymbol && this.level == 0);
    }

}