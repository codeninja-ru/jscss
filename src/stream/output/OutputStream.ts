export interface OutputStream {
    write(str: string): void;
    close(): void;
}
