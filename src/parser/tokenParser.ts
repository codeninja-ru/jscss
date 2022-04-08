import { TokenStream } from "./tokenStream";

export type TokenParser = (stream: TokenStream) => any;
