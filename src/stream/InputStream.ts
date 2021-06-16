export interface InputStream {
    next(): string;
    peek(): string;
    isEof(): boolean;
    formatError(msg: string): Error;
}
