import { Position } from "stream/position";
import { Token } from "token";
import { UnexpectedEndError } from "./parserError";
import { LookAheadTokenStream, TokenStream } from "./tokenStream";
import { peekAndSkipSpaces } from "./tokenStreamReader";

export interface ParsedSourceWithPosition {
    value: ReturnType<TokenParser>;
    position: Position;
}

export function isWithPosition(obj : any) : obj is ParsedSourceWithPosition {
    return obj.postion != undefined && obj.value != undefined;
}

export interface TokenParser<Result = any> {
    (stream : TokenStream) : Result;
    probe? : ProbeFn;
}

export type ProbeFn = (nextToken : NextToken) => boolean;

export interface NextToken {
    readonly token : Token;
    readonly exists : boolean;
}

class NoNextToken implements NextToken {
    readonly exists = false;
    get token() : Token {
        throw new Error("nextToken doesn't exist");
    }
}

const NO_NEXT_TOKEN = new NoNextToken();

export class NextNotSpaceToken implements NextToken {
    readonly exists = true;

    private constructor(public readonly token : Token) {
    }

    static fromStream(stream : TokenStream) : NextToken {
        try {
            const nextToken = peekAndSkipSpaces(new LookAheadTokenStream(stream));
            return new NextNotSpaceToken(nextToken);
        } catch(e) {
            if (e instanceof UnexpectedEndError) {
                return NO_NEXT_TOKEN;
            }

            throw e;
        }
    }

}

export type TokenParserArrayWithPosition = (stream: TokenStream) => ParsedSourceWithPosition[];
