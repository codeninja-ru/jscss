import { Position } from "stream/position";
import { TokenStream } from "./tokenStream";

export interface ParsedSourceWithPosition {
    value: ReturnType<TokenParser>;
    position: Position;
}

export function isWithPosition(obj : any) : obj is ParsedSourceWithPosition {
    return obj.postion != undefined && obj.value != undefined;
}

export type TokenParser<Result = any> = (stream: TokenStream) => Result;
export type TokenParserArrayWithPosition = (stream: TokenStream) => ParsedSourceWithPosition[];
