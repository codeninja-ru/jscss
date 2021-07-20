export interface InputStream {
    next(): string;
    peek(): string;
    isEof(): boolean;
    formatError(msg: string): Error;
    readUntil(searchString: string) : string | null;
}
