import { Symbols } from "symbols";
import { TokenType } from "token";
import { cssCharset, importStatement, mediaStatement, pageStatement, selector } from "./cssParser";
import { assignmentExpression, moduleItem, parseComment, propertyName } from "./parser";
import { anyLiteral, anyString, block, comma, commaList, dollarSign, firstOf, ignoreSpacesAndComments, lazyBlock, loop, map, noSpacesHere, oneOfSymbols, returnRawValue, semicolon, sequence, strictLoop, symbol } from "./parserUtils";
import { JssBlockNode, NodeType, SyntaxTree } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

export function parseJssScript(stream : TokenStream) : SyntaxTree {
    return strictLoop(jssStatement)(stream);
}

function jssPropertyDefinition(stream : TokenStream) : void {
    const result = firstOf(
        //sequence(propertyName, symbol(Symbols.colon), assignmentExpression), // clear js assigment
        //sequence(propertyName, symbol(Symbols.colon), expr, optional(prioStatement)), // clear css
        map(sequence(propertyName, symbol(Symbols.colon), map(returnRawValue(loop(
            firstOf(
                sequence(dollarSign, noSpacesHere, lazyBlock), // template string ${}
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
        })), ([propName,,rest]) => {
            return {
                type: NodeType.JssDeclaration,
                prop: propName,
                value: rest,
            }
        }),
        map(returnRawValue(sequence(symbol(Symbols.dot3), assignmentExpression)),
            (value) => {
                return {
                    type: NodeType.JsSpread,
                    value,
                };
            }), // js assignment
    )(stream);

    semicolon(stream);

    return result;
}

export function rulesetStatement(stream : TokenStream) : JssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = block(TokenType.LazyBlock, strictLoop(firstOf(
        ignoreSpacesAndComments,
        jssPropertyDefinition,
        rulesetStatement,
    )))(stream);

    return {
        type: NodeType.JssBlock,
        selectors,
        items: cssBlock.items,
    }
}

export function stylesheetItem(stream : TokenStream) : ReturnType<TokenParser> {
    //TODO everything that starts with @ can be optimized by combining together
    return firstOf(
        cssCharset,
        importStatement,
        rulesetStatement,
        mediaStatement,
        pageStatement,
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
        moduleItem,
        stylesheetItem,
        parseComment,
    )(stream);
}
