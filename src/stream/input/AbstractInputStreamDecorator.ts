import { InputStream } from './InputStream';

export abstract class AbstractInputStreamDecorator implements InputStream {
    protected stream: InputStream;

    constructor(stream: InputStream) {
        this.stream = stream;
    }

    next(): string {
        return this.stream.next();
    }

    peek(): string {
        return this.stream.peek();
    }

    formatError(msg: string): Error {
        return this.stream.format(msg);
    }

    abstract isEof(): boolean;
}
