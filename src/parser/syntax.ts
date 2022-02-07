import { Keywords } from "keyworkds";
import { Symbols } from "symbols";
import { CommentToken, LiteralToken, Token } from 'token';
import { CommonParser } from "./parser";
import { isAnyBlock, isAnyLiteral, isAnyString, isComment, isKeyword, isSymbol, or } from "./predicates";
import { ArraySyntaxRules, SyntaxRule } from "./syntaxRules";
import { CommentNode, NodeType, SyntaxTree, VarDeclaraionNode } from './syntaxTree';

const JS_IMPORT = new ArraySyntaxRules([
    new SyntaxRule(isKeyword(Keywords._import)),
    new SyntaxRule(or(isAnyBlock(), isAnyLiteral())),
    new SyntaxRule(isKeyword(Keywords._from)),
    new SyntaxRule(isAnyString()),
], function([, vars, , path], rawValue) {
    return {
        type: NodeType.JsImport,
        path: (path as LiteralToken).value,
        vars: vars.value,
        rawValue,
    };
});

const COMMENT = new ArraySyntaxRules([
    new SyntaxRule(isComment()),
], ([value]) => {
    return {
        type: NodeType.Comment,
        value: (value as CommentToken).value,
    } as CommentNode;
});

const VAR_DECLARATION = new ArraySyntaxRules([
    new SyntaxRule(or(
        isKeyword(Keywords._var),
        isKeyword(Keywords._let),
        isKeyword(Keywords._const),
    )),
    new SyntaxRule(isAnyLiteral()),
    new SyntaxRule(isSymbol(Symbols.eq)),

], ([, name,], rawValue) => {
    return {
        type: NodeType.Var_Declaration,
        rawValue,
    } as VarDeclaraionNode
});

export const TopLevelParser = new CommonParser([
    JS_IMPORT,
    COMMENT,
    VAR_DECLARATION,
]);

export function parse(tokens: Token[]): SyntaxTree {
    return TopLevelParser.parse(tokens);
}
