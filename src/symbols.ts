import { SymbolToken } from "token";

export class Symbol {
    constructor(readonly name: string) {
    }

    equal(token: SymbolToken): boolean {
        return token.value == this.name;
    }
}

export const Symbols = {
    eq: new Symbol('='),
}
