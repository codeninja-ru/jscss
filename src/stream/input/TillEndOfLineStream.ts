import { InputStream } from './InputStream';
import { AbstractInputStreamDecorator } from './AbstractInputStreamDecorator';

export class TillEndOfLineStream extends AbstractInputStreamDecorator implements InputStream {
    isEof(): boolean {
        return this.stream.isEof() || this.stream.peek() == "\n";
    }

}
