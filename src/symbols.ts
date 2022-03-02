import { SymbolToken } from "token";

export class SyntaxSymbol {
    constructor(readonly name: string) {
    }

    equal(token: SymbolToken): boolean {
        return token.value == this.name;
    }
}

export const Symbols = {
    eq: new SyntaxSymbol('='),
    astersik: new SyntaxSymbol('*'),
    lt: new SyntaxSymbol('>'),
    gt: new SyntaxSymbol('<'),
    tilde: new SyntaxSymbol('~'),
    minus: new SyntaxSymbol('-'),
    plus: new SyntaxSymbol('+'),
    at: new SyntaxSymbol('@'),
    dot: new SyntaxSymbol('.'),

    optionalChain: new SyntaxSymbol('?.'),
}
