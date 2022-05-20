import { stylesheetItem } from "./cssParser";
import { moduleItem, parseComment } from "./parser";
import { firstOf, strictLoop } from "./parserUtils";
import { JssScriptNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

export function parseJssScript(stream : TokenStream) : JssScriptNode {
    return {
        type: NodeType.JssScript,
        items: strictLoop(jssStatement)(stream),
    }
}

/**
 * implements:
 * js + css
 *
 * */
function jssStatement(stream : TokenStream) : ReturnType<TokenParser> {
    return firstOf(
        //TODO
        moduleItem,
        stylesheetItem,
        parseComment,
    )(stream);
}
