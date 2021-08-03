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
}

export function parseTokens(tokenTree: Token[]) {
    for (let token of tokenTree) {
        switch (token.type) {
            case TokenType.Block:
            case TokenType.Comma:
            case TokenType.Comment:
            case TokenType.LazyBlock:
            case TokenType.Literal:
            case TokenType.MultilineComment:
            case TokenType.RoundBrackets:
            case TokenType.Space:
            case TokenType.SquareBrackets:
            case TokenType.String:
            case TokenType.Symbol:
            case TokenType.TemplateString:
            default:
                throw new Error(`unknown token ${JSON.stringify(token)}`);
        }
    }
}
