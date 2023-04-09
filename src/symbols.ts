import { SymbolToken, Token, TokenType } from "token";


export class SyntaxSymbol {
    constructor(readonly name: string) {
    }
    equal(token : Token) : token is SymbolToken {
        return token.type == TokenType.Symbol && token.value === this.name;
    }
}

export class MultiSymbol {
    constructor(readonly name: string) {
    }
}

export const Symbols = {
    eq: new SyntaxSymbol('='),
    astersik: new SyntaxSymbol('*'),
    lt: new SyntaxSymbol('>'),
    gt: new SyntaxSymbol('<'),
    lteq: new SyntaxSymbol('>='),
    gteq: new SyntaxSymbol('<='),
    tilde: new SyntaxSymbol('~'),
    minus: new SyntaxSymbol('-'),
    plus: new SyntaxSymbol('+'),
    at: new SyntaxSymbol('@'),
    dot: new SyntaxSymbol('.'),
    comma: new SyntaxSymbol(','),
    question: new SyntaxSymbol('?'),
    colon: new SyntaxSymbol(':'),
    semicolon: new SyntaxSymbol(';'),
    div: new SyntaxSymbol('/'),
    backslash: new SyntaxSymbol('\\'),
    percent: new SyntaxSymbol('%'),
    numero: new SyntaxSymbol('#'),

    and: new SyntaxSymbol('&&'),
    or: new SyntaxSymbol('||'),
    coalesce: new SyntaxSymbol('??'),
    bitwiseAnd: new SyntaxSymbol('&'),
    bitwiseOr: new SyntaxSymbol('|'),
    bitwiseNot: new SyntaxSymbol('~'),
    bitwiseXor: new SyntaxSymbol('^'),
    not: new SyntaxSymbol('!'),

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
