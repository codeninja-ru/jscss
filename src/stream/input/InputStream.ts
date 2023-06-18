import { Position } from "stream/position";

export interface InputStream {
    next() : string;
    peek() : string;
    lookahead() : string | undefined;
    isEof() : boolean;
    readUntil(searchString: string) : string;
    position() : Position;
    toString() : string;
}
