import { LiteralToken } from "token";

export class Keyword {
    constructor(readonly name: string) {
    }

    equal(token: LiteralToken): boolean {
        return token.value.toLowerCase() == this.name;
    }
}

export const ReservedWords = {"await": 1, "break": 1, "case": 1, "catch": 1, "class": 1, "const": 1, "continue": 1, "debugger": 1, "default": 1, "delete": 1, "do": 1, "else": 1, "enum": 1, "export" : 1, "extends": 1, "false": 1, "finally": 1, "for": 1, "function": 1, "if": 1, "import": 1, "in": 1, "instanceof": 1, "new": 1, "null": 1, "return": 1, "super": 1, "switch": 1, "this": 1, "throw": 1, "true": 1, "try": 1, "typeof": 1, "var": 1, "void": 1, "while": 1, "with": 1, "yield": 1};

export const Keywords = {
    _class: new Keyword('class'),
    _extends: new Keyword('extends'),
    _function: new Keyword('function'),
    _import: new Keyword('import'),
    _as: new Keyword('as'),
    _if: new Keyword('if'),
    _while: new Keyword('while'),
    _do: new Keyword('do'),
    _continue: new Keyword('continue'),
    _break: new Keyword('break'),
    _return: new Keyword('return'),
    _for: new Keyword('for'),
    _switch: new Keyword('switch'),
    _case: new Keyword('case'),
    _else: new Keyword('else'),
    _with: new Keyword('with'),
    _super: new Keyword('super'),
    _new: new Keyword('new'),
    _target: new Keyword('target'),
    _meta: new Keyword('meta'),
    _async: new Keyword('async'),
    _of: new Keyword('of'),
    _in: new Keyword('in'),
    _instanceof: new Keyword('instanceof'),
    _typeof: new Keyword('typeof'),
    _void: new Keyword('void'),
    _try: new Keyword('try'),
    _catch: new Keyword('catch'),
    _finally: new Keyword('finally'),
    _delete: new Keyword('delete'),
    _static: new Keyword('static'),
    _await: new Keyword('await'),
    _yield: new Keyword('yield'),
    _this: new Keyword('this'),
    _throw: new Keyword('throw'),
    _default: new Keyword('default'),
    _debugger: new Keyword('debugger'),

    _var: new Keyword('var'),
    _let: new Keyword('let'),
    _const: new Keyword('const'),

    _export: new Keyword('export'),
    _from: new Keyword('from'),

    _null: new Keyword('null'),
    _true: new Keyword('true'),
    _false: new Keyword('false'),
}
