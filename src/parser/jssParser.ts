import { Keywords } from "keywords";
import { Symbols } from "symbols";
import { TokenType } from "token";
import { attrib, combinator, cssCharset, hash, importStatement, mediaStatement, pageStatement, pseudo } from "./cssParser";
import { assignmentExpression, identifier, moduleItem, parseComment, propertyName } from "./parser";
import { anyLiteral, anyString, block, comma, commaList, dollarSign, firstOf, ignoreSpacesAndComments, keyword, lazyBlock, leftHandRecurciveRule, loop, map, noSpacesHere, oneOfSymbols, optional, returnRawValue, semicolon, sequence, sequenceWithPosition, strictLoop, symbol } from "./parserUtils";
import { BlockNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssSelectorNode, JssSpreadNode, JssVarDeclarationNode, NodeType, SyntaxTree } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { positionOfNextToken } from "./tokenStreamReader";

export function parseJssScript(stream : TokenStream) : SyntaxTree {
    return strictLoop(jssStatement)(stream);
}

const templatePlaceholder = sequence(dollarSign, noSpacesHere, lazyBlock); // template string ${}

function jssSpreadDefinition(stream : TokenStream) : JssSpreadNode {
    const [, value] = sequenceWithPosition(symbol(Symbols.dot3, returnRawValue(assignmentExpression)))(stream);

    return {
        type: NodeType.JssSpread,
        value: value.value,
        valuePos: value.position,
    };
}

function jsProperyDefinition(stream : TokenStream) : JssDeclarationNode {
    //sequence(propertyName, symbol(Symbols.colon), assignmentExpression), // clear js assigment
    //sequence(propertyName, symbol(Symbols.colon), expr, optional(prioStatement)), // clear css
    const [propName,,value] = sequenceWithPosition(propertyName, symbol(Symbols.colon), map(returnRawValue(loop(
        firstOf(
            templatePlaceholder, // template string ${}
            anyLiteral, // NOTE: anyLiteral includes $, it may cause troubles in a wrong order
            anyString,

            oneOfSymbols(
                Symbols.plus,
                Symbols.minus,
                Symbols.at,
                Symbols.not,
                Symbols.div,
                Symbols.dot,
                Symbols.numero,
                Symbols.percent,
            ),
            comma,
        )
    )), (result) => {
        return result.trim();
    }))(stream);

    return {
        type: NodeType.JssDeclaration,
        prop: propName.value,
        propPos: propName.position,
        value: value.value,
        valuePos: value.position,
    };
}

function jssPropertyDefinition(stream : TokenStream) : (JssDeclarationNode | JssSpreadNode) {
    const result = firstOf(
        jsProperyDefinition,
        jssSpreadDefinition,
    )(stream);

    semicolon(stream);

    return result;
}

function jssIdent(stream : TokenStream) : string {
    return returnRawValue(leftHandRecurciveRule(
        firstOf(
            templatePlaceholder,
            anyLiteral,//NOTE it can't be started with numbers, and content some chars, read the spec
        ),
        sequence(noSpacesHere, jssIdent),
    ))(stream);
}

export function simpleSelector(stream : TokenStream) : string {
    const elementName = returnRawValue(firstOf(jssIdent, symbol(Symbols.astersik)));
    const cssClass = sequence(symbol(Symbols.dot), noSpacesHere, jssIdent);
    const rest = firstOf(
        hash,
        cssClass,
        attrib,
        pseudo,
    );

    const name = optional(elementName)(stream);
    if (name) {
        return name + returnRawValue(loop(sequence(noSpacesHere, rest)))(stream);
    } else {
        return returnRawValue(rest)(stream) + returnRawValue(loop(sequence(noSpacesHere, rest)))(stream);
    }
}

export function selector(stream : TokenStream) : JssSelectorNode {
    const pos = positionOfNextToken(stream);

    let result = [simpleSelector(stream)];
    while(!stream.eof()) {
        const comb = optional(combinator)(stream);
        const sel = optional(simpleSelector)(stream);

        if (comb && sel) {
            result.push(comb, sel);
        } else if (sel) {
            result.push(sel);
        } else {
            break;
        }
    }

    return {
        type: NodeType.JssSelector,
        items: result,
        position: pos,
    };
}

/**
 * implements:
 * const varName = {
 *   someCss: rule;
 * }
 *
 * */
function jssVariableStatement(stream : TokenStream) : JssVarDeclarationNode {
    const [exportKeyword, decKeyword, varName,,block] = sequenceWithPosition(
        optional(keyword(Keywords._export)),
        firstOf(
            keyword(Keywords._const),
            keyword(Keywords._let),
            keyword(Keywords._var),
        ),
        identifier,
        symbol(Symbols.eq),
        jssBlockStatement,
    )(stream);

    if (varName.value in {"self" : 1, "_styles" : 1, "JssStylesheet" : 1, "JssStyleBlock" : 1, "JssBlock": 1}) {
        throw new Error(`${varName} is a reseved word`);
    }

    return {
        type: NodeType.JssVarDeclaration,
        keyword: decKeyword.value,
        keywrodPos: decKeyword.position,
        name: varName.value,
        namePos: varName.position,
        items: block.value.items,
        hasExport: exportKeyword !== undefined,
        exportPos: exportKeyword?.position,
    };
}

function jssBlockStatement(stream : TokenStream) : BlockNode<JssBlockItemNode> {
    return block(TokenType.LazyBlock, strictLoop(firstOf(
        ignoreSpacesAndComments,
        jssPropertyDefinition,
        rulesetStatement,
    )))(stream);
}

export function rulesetStatement(stream : TokenStream) : JssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = jssBlockStatement(stream);

    return {
        type: NodeType.JssBlock,
        selectors,
        items: cssBlock.items,
    };
}

export function stylesheetItem(stream : TokenStream) : ReturnType<TokenParser> {
    //TODO everything that starts with @ can be optimized by combining together
    return firstOf(
        cssCharset,
        importStatement,
        rulesetStatement,
        mediaStatement,
        pageStatement,
        jssVariableStatement,
    )(stream);
}

/**
 * implements:
 * js + css
 *
 * */
function jssStatement(stream : TokenStream) : ReturnType<TokenParser> {
    return firstOf(
        ignoreSpacesAndComments, //TODO it's duplicated in stylesheeiItem
        stylesheetItem,
        moduleItem,
        parseComment,
    )(stream);
}
