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

export class MultilineCommentStream extends AbstractInputStreamDecorator {
    private nextStr = '';
    private eof = false;

    private _peek(): string {
        if (this.nextStr == '') {
            return this.peek();
        } else {
            return this.nextStr[0];
        }
    }

    private _next(): string {
        if (this.nextStr == '') {
            return this.stream.next();
        } else {
            const ch = this.nextStr[0];
            this.nextStr = this.nextStr.slice(1);
            return ch;
        }
    }
    
    next(): string {
        if (this.isEof()) {
            throw this.formatError('the end of the multiline block');
        }

        return this._next();
    }

    isEof(): boolean {
        if (this.eof) {
            return true;
        }

        if (this.stream.isEof()) {
            //todo is the end of comment by eof allowed?
            return true;
        }

        var ch = this._peek();

        if (ch == '*') {
            this.nextStr = this._next() + this._next();
            if (this.nextStr == '*/') {
                this.eof = true;
                return true;
            }
        }

        return false;
    }
}

type StringMark = "'" | '"';

export class StringValueStream extends AbstractInputStreamDecorator {
    private isEscapeMode = false;
    constructor(private mark: StringMark, stream: InputStream) {
        super(stream);
    }
    next(): string {
        const ch = this.stream.next();
        this.isEscapeMode = ch == '\\';

        return ch;
    }

    isEof(): boolean {
        if (!this.isEscapeMode && this.peek() == this.mark) {
            return true;
        }
        if (this.stream.isEof()) {
            throw this.formatError('unexpected end of the string');
        }

        return false;
    }

}