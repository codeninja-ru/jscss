import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

export type Equals<X, Y> =
    (<T>() => (T extends /*1st*/ X ? 1 : 2)) extends /*2nd*/
    (<T>() => (T extends /*3rd*/ Y ? 1 : 2))
        ? true
        : false;

export type ReturnTypeMap<R extends TokenParser<any>[]> = {
    [Prop in keyof R] : R[Prop] extends (stream : TokenStream) => infer X
        ? X
        : never;
};

export type FilterNotVoid<R> = R extends [infer Head, ... infer Tail]
    ? Equals<Head, void> extends true
        ? FilterNotVoid<Tail> : [Head, ...FilterNotVoid<Tail>]
    : [];

export type OneOfArray<T extends any[]> = T[number];

export type NeverVoid<T> = [T] extends [void] ? never : T;
