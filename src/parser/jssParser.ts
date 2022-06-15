import { Symbols } from "symbols";
import { TokenType } from "token";
import { cssCharset, importStatement, mediaStatement, pageStatement, selector } from "./cssParser";
import { assignmentExpression, moduleItem, parseComment, propertyName } from "./parser";
import { anyLiteral, anyString, block, comma, commaList, dollarSign, firstOf, ignoreSpacesAndComments, lazyBlock, loop, map, noSpacesHere, oneOfSymbols, returnRawValue, semicolon, sequence, strictLoop, symbol } from "./parserUtils";
import { CssBlockNode, JssScriptNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

export function parseJssScript(stream : TokenStream) : JssScriptNode {
    return {
        type: NodeType.JssScript,
        items: strictLoop(jssStatement)(stream),
    }
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
            console.log(result);
            return result.trim();
        })), ([propName,,rest]) => {
            return {
                type: NodeType.JssDeclaration,
                prop: propName,
                value: rest,
            }
        }),
        sequence(symbol(Symbols.dot3), assignmentExpression), // js assignment
    )(stream);

    semicolon(stream);

    return result;
}

export function rulesetStatement(stream : TokenStream) : CssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = block(TokenType.LazyBlock, strictLoop(firstOf(
        ignoreSpacesAndComments,
        jssPropertyDefinition,
    )))(stream);

    return {
        type: NodeType.CssBlock,
        selectors,
        block: cssBlock,
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
