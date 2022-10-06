import { Token, TokenType } from "token";

export class SyntaxSymbol {
    constructor(readonly name: string) {
    }
}

export class SingleSymbol extends SyntaxSymbol {
    equal(token : Token) : boolean {
        return token.type == TokenType.Symbol && token.value === this.name;
    }
}

export const Symbols = {
    eq: new SingleSymbol('='),
    astersik: new SingleSymbol('*'),
    lt: new SingleSymbol('>'),
    gt: new SingleSymbol('<'),
    lteq: new SyntaxSymbol('>='),
    gteq: new SyntaxSymbol('<='),
    tilde: new SingleSymbol('~'),
    minus: new SingleSymbol('-'),
    plus: new SingleSymbol('+'),
    at: new SingleSymbol('@'),
    dot: new SingleSymbol('.'),
    comma: new SingleSymbol(','),
    question: new SingleSymbol('?'),
    colon: new SingleSymbol(':'),
    semicolon: new SingleSymbol(';'),
    div: new SingleSymbol('/'),
    backslash: new SingleSymbol('\\'),
    percent: new SingleSymbol('%'),
    numero: new SingleSymbol('#'),

    and: new SyntaxSymbol('&&'),
    or: new SyntaxSymbol('||'),
    coalesce: new SyntaxSymbol('??'),
    bitwiseAnd: new SyntaxSymbol('&'),
    bitwiseOr: new SingleSymbol('|'),
    bitwiseNot: new SingleSymbol('~'),
    bitwiseXor: new SingleSymbol('^'),
    not: new SingleSymbol('!'),

    arrow: new SyntaxSymbol('=>'),

    eq2: new SyntaxSymbol('=='),
    eq3: new SyntaxSymbol('==='),
    notEq2: new SyntaxSymbol('!='),
    notEq3: new SyntaxSymbol('!=='),
    astersik2: new SyntaxSymbol('**'),
    minus2: new SyntaxSymbol('--'),
    plus2: new SyntaxSymbol('++'),
    dot3: new SyntaxSymbol('...'),

    shiftLeft: new SyntaxSymbol('<<'),
    shiftRight: new SyntaxSymbol('>>'),
    shiftRight3: new SyntaxSymbol('>>>'),

    eq2and: new SyntaxSymbol('&&='),
    eq2or: new SyntaxSymbol('||='),
    eq2questions: new SyntaxSymbol('??='),

    optionalChain: new SyntaxSymbol('?.'),
}

export const AssignmentOperator = ['*=', '/=', '%=', '+=', '-=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '**='].map((item) => new SyntaxSymbol(item));

export const LogicalSymbols = {
    and: new SyntaxSymbol('&&'),
    or: new SyntaxSymbol('||'),
    coalesce: new SyntaxSymbol('??'),

}
