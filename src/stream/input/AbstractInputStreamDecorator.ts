import { InputStream } from './InputStream';

export class AbstractInputStreamDecorator implements InputStream {
    protected stream: InputStream;

    constructor(stream: InputStream) {
        this.stream = stream;
    }

    next(): string {
        this.stream.next();
    }

    peek(): string {
        this.stream.peek();
    }

    formatError(msg: string): Error {
        return this.stream.format(msg);
    }
}
