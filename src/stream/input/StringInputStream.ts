import { InputStream } from './InputStream';

export class StringInputStream implements InputStream {
    private input = '';
    private pos = 0;
    private line = 1;
    private col = 0;

    constructor(input: string) {
        this.input = input;
    }

    next(): string {
        var ch = this.input.charAt(this.pos++);
        if (ch == "\n") this.line++, this.col = 0; else this.col++;
        return ch;
    }

    peek(): string {
        return this.input.charAt(this.pos);
    }

    isEof(): boolean {
        return this.peek() == '';
    }

    formatError(msg: string): Error {
        return new Error(msg + " (" + this.line + ":" + this.col + ")");
    }
}
