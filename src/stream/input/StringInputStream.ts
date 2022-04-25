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
        if (ch == '') {
            throw this.formatError('reading beyond the end of the stream');
        }
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

    readUntil(str: string) : string {
        const idx = this.input.indexOf(str, this.pos);
        if (idx == -1) {
            const result = this.input.substr(this.pos);
            this.pos = this.input.length;
            return result;
        }

        const result = this.input.substr(this.pos, idx - this.pos + str.length);
        this.pos = idx + str.length;

        var lineCount = 0;
        var pos = -1;
        while ((pos = result.indexOf("\n", pos + 1)) != -1) {
            lineCount++;
        }
        this.line += lineCount;

        return result;
    }
}
