import { OutputStream } from './OutputStream';

export class StringOutputStream implements OutputStream {
    private str = '';

    write(str: string): void {
        this.str += str;
    }

    close() { }

    value(): string {
        return this.str;
    }
}
