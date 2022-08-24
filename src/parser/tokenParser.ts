import { Position } from "stream/position";
import { TokenStream } from "./tokenStream";

export interface ParsedSourceWithPosition {
    value: ReturnType<TokenParser>;
    position: Position;
}

export interface SourceFragment {
    readonly position: Position;
    value: string;
}

export type TokenParser = (stream: TokenStream) => any;
export type TokenParserArrayWithPosition = (stream: TokenStream) => ParsedSourceWithPosition[];
