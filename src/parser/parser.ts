import { Keyword, Keywords } from 'keyworkds';
import { Token, TokenType } from 'token';

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

interface IAstNode {
    type: NodeType;
    statement: IStatement;
}

type IStatement = Array<Token>;

class Statement extends Array<Token> {
    [idx: number]: Token;

    firstLiteral(): string | null {
        for (var token of this) {
            if (token.type == TokenType.Space) {
                continue;
            }

            if (token.type == TokenType.Literal) {
                return token.value;
            } else {
                return null;
            }

        }

        return null;
    }

}

class Statements {
    private _current: Statement; //todo sould be read only outside of the class
    constructor(private items: IStatement[] = []) {
        this._current = new Statement();
    }

    public get current(): Statement {
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

function parseBlock(stm: Statements) {
    var literal = statements.current.firstLiteral();

    var jsKeywords = Object.values(Keywords);

    if (literal == null) {

    }

    if (jsKeywords.includes(literal)) {
        return
    }
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
                parseBlock(statements);
                break;
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
