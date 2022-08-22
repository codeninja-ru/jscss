import { Position } from "stream/position";
import { TokenStream } from "./tokenStream";

export interface ParsedSource {
    value: ReturnType<TokenParser>;
    position: Position;
}

export type TokenParser = (stream: TokenStream) => any;
export type TokenParserArrayWithPosition = (stream: TokenStream) => ParsedSource[];
