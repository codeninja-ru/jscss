import { LiteralToken } from "token";

export class Keyword {
    constructor(readonly name: string) {
    }

    equal(token: LiteralToken): boolean {
        return token.value.toLowerCase() == this.name;
    }
}

export const Keywords = {
    _class: new Keyword('class'),
    _function: new Keyword('function'),
    _import: new Keyword('import'),
    _if: new Keyword('if'),
    _while: new Keyword('while'),
    _for: new Keyword('for'),
    _switch: new Keyword('switch'),
    _case: new Keyword('case'),
    _else: new Keyword('else'),
    _with: new Keyword('with'),

    _var: new Keyword('var'),
    _let: new Keyword('let'),
    _const: new Keyword('const'),

    _export: new Keyword('export'),
    _from: new Keyword('from'),

    // css keywords
    css: {
        _import: new Keyword('@import'),
    }
}
