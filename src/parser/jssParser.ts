import { stylesheetItem } from "./cssParser";
import { moduleItem } from "./parser";
import { firstOf, strictLoop } from "./parserUtils";
import { JssScriptNode, NodeType } from "./syntaxTree";
import { TokenStream } from "./tokenStream";

export function parseJssScript(stream : TokenStream) : JssScriptNode {
    return {
        type: NodeType.JssScript,
        items: strictLoop(jssStatement)(stream),
    }
}

/**
 * implements:
 *
 *
 * */
function jssStatement(stream : TokenStream) : void {
    return firstOf(
        //TODO
        moduleItem,
        stylesheetItem,
    )(stream);
}
