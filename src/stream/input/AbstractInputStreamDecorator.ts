import { Position } from 'stream/position';
import { InputStream } from './InputStream';

export abstract class AbstractInputStreamDecorator implements InputStream {
    protected stream: InputStream;

    constructor(stream: InputStream) {
        this.stream = stream;
    }
    
    readUntil(searchString: string): string {
        return this.stream.readUntil(searchString);
    }

    next(): string {
        return this.stream.next();
    }

    peek(): string {
        return this.stream.peek();
    }

    abstract isEof(): boolean;

    position() : Position {
        return this.stream.position();
    }

    lookahead() : string | undefined {
        return this.stream.lookahead();
    }
}
