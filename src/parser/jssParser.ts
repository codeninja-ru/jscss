import { Symbols } from "symbols";
import { TokenType } from "token";
import { cssCharset, importStatement, mediaStatement, pageStatement, rulesetStatement, selector } from "./cssParser";
import { jssPropertyDefinition, moduleItem, parseComment } from "./parser";
import { block, commaList, firstOf, ignoreSpacesAndComments, keyword, list, noSpacesHere, optional, rawValue, sequence, strictLoop, symbol } from "./parserUtils";
import { CssBlockNode, JssScriptNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

export function parseJssScript(stream : TokenStream) : JssScriptNode {
    return {
        type: NodeType.JssScript,
        items: strictLoop(jssStatement)(stream),
    }
}

export function declaration(stream : TokenStream) : CssDeclarationNode {
    return firstOf(

    )(stream);
}

export function rulesetStatement(stream : TokenStream) : CssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = block(TokenType.LazyBlock, commaList(jssPropertyDefinition, true)(stream);

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
