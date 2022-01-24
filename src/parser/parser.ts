import { Token, TokenType } from 'token';
import { IStatement, Statement } from './statement';

enum NodeType {
    CssImport, // @import
    JsCode,
    CssSelectors,
    CssBlock,
    CssMedia,
    CssComment,
    CssAtribure,
    CssValue,
    JsSpread, // ...
    JsPlaceholder, // ${...}
}

class Statements {
    private _current: IStatement;
    constructor(private items: IStatement[] = []) {
        this._current = new Statement();
    }

    public get current(): IStatement {
        return this._current;
    }

    pushToken(token: Token) {
        this._current.push(token);
    }

    pushNewStatement() {
        this.items.push(this._current);
        this._current = new Statement();
    }

}

function stmStartsWith(stm: IStatement, literal: string): boolean {
    var result = false;
    for (let token of stm) {
        if (token.type == TokenType.Space) {
            continue;
        }

        if (token.type == TokenType.Literal) {
            result = token.value == literal;
            break;
        } else {
            break;
        }

    }

    return result;
}

export function parseTokens(tokenTree: Token[]) {
    const statements = new Statements();
    for (let token of tokenTree) {
        statements.pushToken(token);
        switch (token.type) {
            case TokenType.Semicolon:
                statements.pushNewStatement();
                break;
            case TokenType.Block:
            case TokenType.LazyBlock:
            case TokenType.Comma:
            case TokenType.Comment:
            case TokenType.Literal:
            case TokenType.MultilineComment:
            case TokenType.RoundBrackets:
            case TokenType.Space:
            case TokenType.SquareBrackets:
            case TokenType.String:
            case TokenType.Symbol:
            case TokenType.TemplateString:
                break;
            default:
                throw new Error(`unknown token ${JSON.stringify(token)}`);
        }
    }
}
