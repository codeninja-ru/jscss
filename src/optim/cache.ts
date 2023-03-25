import { TokenParser } from "parser/tokenParser";

const cache = new Map<Number, TokenParser>();
export function instance(key : Number, fn : () => TokenParser) : TokenParser {
    let obj = cache.get(key);
    if (obj) {
        return obj;
    } else {
        obj = fn();
        cache.set(key, obj);
        return obj;
    }
}
