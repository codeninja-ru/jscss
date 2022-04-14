// the spec is here https://www.w3.org/TR/CSS2/grammar.html#q25.0

import { Keywords } from "keywords";
import { Symbols } from "symbols";
import { anyBlock, anyLiteral, anyString, comma, commaList, firstOf, keyword, list, loop, noSpacesHere, optional, rawValue, regexpLiteral, roundBracket, semicolon, sequence, squareBracket, symbol } from "./parserUtils";
import { CssBlockNode, NodeType } from "./syntaxTree";
import { TokenStream } from "./tokenStream";

/**
 * implements:
 * stylesheet
  : [ CHARSET_SYM STRING ';' ]?
    [S|CDO|CDC]* [ import [ CDO S* | CDC S* ]* ]*
    [ [ ruleset | media | page ] [ CDO S* | CDC S* ]* ]*
  ;
 *
 * */
function stylesheetItem(stream : TokenStream) : void {
    firstOf(
        // [ CHARSET_SYM STRING ';' ]?
        sequence(symbol(Symbols.at), noSpacesHere, keyword(Keywords.cssCharset), anyString, symbol(Symbols.semicolon)),
        importStatement,
        rulesetStatement,
        mediaStatement,
        pageStatement,
    )(stream);
}

export function parseCssStyleSheet(stream : TokenStream) : void {
    //TODO
    loop(stylesheetItem)(stream);
}

/**
 *impemnets:
 import
  : IMPORT_SYM S*
    [STRING|URI] S* media_list? ';' S*
  ;
 * */
function importStatement(stream : TokenStream) : void {
    sequence(
        symbol(Symbols.at),
        noSpacesHere,
        keyword(Keywords._import),
        firstOf(
            anyString,
            sequence(keyword(Keywords.cssUrl), noSpacesHere, roundBracket)
        ),
        optional(mediaList),
        semicolon,
    )(stream);
}

/**
 * implements:
 * media_list
  : medium [ COMMA S* medium]*
  ;
 * */
function mediaList(stream : TokenStream) : void {
    commaList(ident)(stream);
}

function ident(stream : TokenStream) : void {
    //NOTE it can't be started with numbers, and content some chars, read the spec
    anyLiteral(stream);
}

/**
 * implements:
 * ruleset
  : selector [ ',' S* selector ]*
    '{' S* declaration? [ ';' S* declaration? ]* '}' S*
  ;
 * */
function rulesetStatement(stream : TokenStream) : CssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = anyBlock(stream); //TODO parse '{' S* declaration? [ ';' S* declaration? ]* '}' S*

    return {
        type: NodeType.CssBlock,
        selectors,
        block: cssBlock,
    }
}

/**
 * implements:
 * selector
  : simple_selector [ combinator selector | S+ [ combinator? selector ]? ]?
  ;
 * */
function selector(stream : TokenStream) : void {
    list(simpleSelector, optional(combinator))(stream); //TODO can we acutally do optional in the list?
}

/**
 * implements:
 * simple_selector
  : element_name [ HASH | class | attrib | pseudo ]*
  | [ HASH | class | attrib | pseudo ]+
  ;

  element_name
  : IDENT | '*'
  ;
 * */
function simpleSelector(stream : TokenStream) : string {
    const elementName = firstOf(ident, symbol(Symbols.astersik));
    const cssClass = sequence(symbol(Symbols.dot), noSpacesHere, ident);
    const name = optional(elementName)(stream);
    const rest = firstOf(
        hash,
        cssClass,
        attrib,
        pseudo,
    );

    let restResult;

    if (name) {
        restResult = loop(sequence(noSpacesHere, rest))(stream);
    } else {
        restResult = optional(rest)(stream);
    }

    return [name, restResult].join('');
}

/**
 * implements:
 * "#"{name}		{return HASH;}
 *
 * */
function hash(stream : TokenStream) : string {
    return rawValue(sequence(
        symbol(Symbols.numero),
        noSpacesHere,
        // nmchar		[_a-z0-9-]|{nonascii}|{escape} //TODO test out
        anyLiteral
    ))(stream);
}

/**
 * implements:
 * attrib
  : '[' S* IDENT S* [ [ '=' | INCLUDES | DASHMATCH ] S*
    [ IDENT | STRING ] S* ]? ']'
  ;
 *
 * */
function attrib(stream : TokenStream) : string {
    return squareBracket(stream); //TODO parse the content
}

/**
 * implements:
 * pseudo
  : ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  ;
 *
 * */
function pseudo(stream : TokenStream) : void {
    sequence(
        symbol(Symbols.colon),
        firstOf(
            ident,
            sequence(
                ident,
                noSpacesHere,
                roundBracket, //TODO parse
            )
        )
    )(stream);
}
