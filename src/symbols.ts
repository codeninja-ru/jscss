import { SymbolToken, Token, TokenType } from "token";

type SingleCharSymbol = '~' | '@' | '#' | '%' | '^' | '&' | '*' | '<' | '>'
    | '"' | '\'' | '/' | '\\' | '?' | '!' | '|' | '`' | '.' | ',' | ';' | ':'
    | '+' | '-' | '=';

export class SyntaxSymbol {
    constructor(readonly name: SingleCharSymbol) {
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
    lteq: new MultiSymbol('>='),
    gteq: new MultiSymbol('<='),
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

    and: new MultiSymbol('&&'),
    or: new MultiSymbol('||'),
    coalesce: new MultiSymbol('??'),
    bitwiseAnd: new SyntaxSymbol('&'),
    bitwiseOr: new SyntaxSymbol('|'),
    bitwiseNot: new SyntaxSymbol('~'),
    bitwiseXor: new SyntaxSymbol('^'),
    not: new SyntaxSymbol('!'),

    arrow: new MultiSymbol('=>'),

    eq2: new MultiSymbol('=='),
    eq3: new MultiSymbol('==='),
    notEq2: new MultiSymbol('!='),
    notEq3: new MultiSymbol('!=='),
    astersik2: new MultiSymbol('**'),
    minus2: new MultiSymbol('--'),
    plus2: new MultiSymbol('++'),
    dot3: new MultiSymbol('...'),

    shiftLeft: new MultiSymbol('<<'),
    shiftRight: new MultiSymbol('>>'),
    shiftRight3: new MultiSymbol('>>>'),

    eq2and: new MultiSymbol('&&='),
    eq2or: new MultiSymbol('||='),
    eq2questions: new MultiSymbol('??='),

    optionalChain: new MultiSymbol('?.'),
}

export const AssignmentOperator = ['*=', '/=', '%=', '+=', '-=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '**='].map((item) => new MultiSymbol(item));
