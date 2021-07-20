import { BlockInputStream, InputStream, KindOfSpaceInputStream, LiteralInputStream, readToEnd } from "stream/input";
import { Token, SpaceToken } from "token";

export type Reader = () => Token | null;

export function makeSpaceReader(stream: InputStream) : Reader {
    return function() {
        if (KindOfSpaceInputStream.isKindOfSpace(ch)) {
            return {
                type: 'space',
                value: readToEnd(new KindOfSpaceInputStream(stream))
            } as SpaceToken;
        }

        return null;
    };
}

export function makeCommaReader(stream: InputStream) : Reader {
    return function() {
        var ch = stream.peek();
        if (ch == ',') {
            stream.next();
            return {
                type: 'comma',
            } as Token;
        }

        return null;
    };
}

export function makeLiteralReader(stream: InputStream) : Reader {
    return function () {
        if (LiteralInputStream.isLiteral(stream.peek())) {
            return {
                type: 'literal',
                value: readToEnd(new LiteralInputStream(stream))
            } as Token;
        }

        return null;
    };
}

export function makeBlockReader(stream: InputStream) : Reader {
    return function() {
        if (BlockInputStream.isBlockStart(stream.peek())) {
            return {
                type: 'lazy_block',
                value: readToEnd(new BlockInputStream(stream)),
            } as Token;
        }
        return null;
    };
}

/**
 * does nothing, throws an error
 * @param stream 
 * @param error error message
 * @returns 
 */
export function makeUnexpectedSymbolReader(stream: InputStream) : Reader {
    return function() {
        throw stream.formatError(`unexpected symbol '${ch}' code: ${ch.charCodeAt(0)}`);
    }
}