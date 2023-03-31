import { Position } from 'stream/position';
import { InputStream } from './InputStream';

function readChar(str : string, pos : number) : string {
    if (pos < str.length) {
        return str.charAt(pos);
    } else {
        throw new Error('reading beyond the end of the stream');
    }
}

export class StringInputStream implements InputStream {
    private input = '';
    private pos = 0;
    private line : number;
    private col : number;

    constructor(input: string, line = 1, col = 1) {
        this.input = input;
        this.line = line;
        this.col = col;
    }

    next(): string {
        var ch = readChar(this.input, this.pos++);
        if (ch == "\n") {
            this.line++;
            this.col = 1;
        } else {
            this.col++;
        }
        return ch;
    }

    peek(): string {
        return readChar(this.input, this.pos);
    }

    isEof(): boolean {
        return this.pos >= this.input.length;
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

    position() : Position {
        return {
            line: this.line,
            col: this.col,
        }
    }
}
