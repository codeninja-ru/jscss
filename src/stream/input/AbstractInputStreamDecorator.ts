import { InputStream } from './InputStream';

export abstract class AbstractInputStreamDecorator implements InputStream {
    protected stream: InputStream;

    constructor(stream: InputStream) {
        this.stream = stream;
    }
    
    readUntil(searchString: string): string | null {
        return this.stream.readUntil(searchString);
    }

    next(): string {
        return this.stream.next();
    }

    peek(): string {
        return this.stream.peek();
    }

    formatError(msg: string): Error {
        return this.stream.formatError(msg);
    }

    abstract isEof(): boolean;
}
