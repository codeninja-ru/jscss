// the spec is here https://www.w3.org/TR/CSS2/grammar.html#q25.0

import { Keywords } from "keywords";
import { Symbols } from "symbols";
import { TokenType } from "token";
import { anyLiteral, anyString, block, commaList, firstOf, keyword, list, loop, noSpacesHere, oneOfSymbols, optional, rawValue, regexpLiteral, roundBracket, semicolon, sequence, squareBracket, symbol } from "./parserUtils";
import { CssBlockNode, CssSelectorNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
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
export function stylesheetItem(stream : TokenStream) : void {
    //TODO everything that starts with @ can be optimized by combining together
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
            uri,
        ),
        optional(mediaList),
        semicolon,
    )(stream);
}

/**
 * implements:
 * "url("{w}{string}{w}")" {return URI;}
"url("{w}{url}{w}")"    {return URI;}
 *
 * */
function uri(stream : TokenStream) : void {
    sequence(keyword(Keywords.cssUrl), noSpacesHere, roundBracket)(stream);
}

/**
 * implements:
 * media_list
  : medium [ COMMA S* medium]*
  ;
 * */
function mediaList(stream : TokenStream) : void {
    return commaList(ident)(stream);
}

function ident(stream : TokenStream) : string {
    //NOTE it can't be started with numbers, and content some chars, read the spec
    return anyLiteral(stream);
}

/**
 * implements:
 * ruleset
  : selector [ ',' S* selector ]*
    '{' S* declaration? [ ';' S* declaration? ]* '}' S*
  ;
 * */
export function rulesetStatement(stream : TokenStream) : CssBlockNode {
    const selectors = commaList(selector)(stream);
    const cssBlock = block(TokenType.LazyBlock, list(
        declaration,
        symbol(Symbols.semicolon),
        true,
    ))(stream);

    return {
        type: NodeType.CssBlock,
        selectors,
        block: cssBlock,
    }
}

/**
 * implements:
 * declaration
  : property ':' S* expr prio?
  ;
 *
 * */
function declaration(stream : TokenStream) : void {
    sequence(
        ident,
        symbol(Symbols.semicolon),
        expr,
        optional(sequence(
            // prio
            // : IMPORTANT_SYM S*
            symbol(Symbols.not),
            keyword(Keywords.cssImportant),
        )),
    )(stream);
}

/**
 * implements:
 * expr
  : term [ operator? term ]*
  ;
 *
 * */
function expr(stream : TokenStream) : void {
    term(stream);
    loop(
        sequence(
            optional(oneOfSymbols(Symbols.div, Symbols.comma)),
            term,
        )
    )(stream);
}

/**
 * implements:
 * term
  : unary_operator?
    [ NUMBER S* | PERCENTAGE S* | LENGTH S* | EMS S* | EXS S* | ANGLE S* |
      TIME S* | FREQ S* ]
  | STRING S* | IDENT S* | URI S* | hexcolor | function
  ;
 *
 * */
function term(stream : TokenStream) : void {
    sequence(
        optional(unaryOperator),
        firstOf(
            // [ NUMBER S* | PERCENTAGE S* | LENGTH S* | EMS S* | EXS S* | ANGLE S* | TIME S* | FREQ S* ]
            regexpLiteral(/^([0-9]+|[0-9]*\.[0-9]+)(\%|px|cm|mm|in|pt|pc|em|ex|deg|rad|grad|ms|s|hz|khz)?$/g),
            anyString,
            ident,
            uri,
            sequence(symbol(Symbols.numero), noSpacesHere, anyLiteral),
            functionCallDoNothing,
        )

    )(stream);
}

/**
 * implements:
 * unary_operator
  : '-' | '+'
  ;
 *
 * */
function unaryOperator(stream : TokenStream) : void {
    oneOfSymbols(Symbols.plus, Symbols.minus)(stream);
}

/**
 * implements:
 * selector
  : simple_selector [ combinator selector | S+ [ combinator? selector ]? ]?
  ;
 * */ //TODO remove export
export function selector(stream : TokenStream) : CssSelectorNode {
    let result = [simpleSelector(stream)];
    while(!stream.eof()) {
        const comb = optional(combinator)(stream);
        if (comb) {
            result.push(comb);
        }
        const sel = optional(simpleSelector)(stream);
        if (sel) {
            result.push(sel);
        } else {
            break;
        }
    }

    return {
        type: NodeType.CssSelector,
        items: result,
    };
}

/**
 * implements:
 * combinator
  : '+' S*
  | '>' S*
  ;
 *
 * */
function combinator(stream : TokenStream) : void {
    oneOfSymbols(
        Symbols.plus,
        Symbols.lt,
    )(stream);
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
 * */ //TODO remove export
export function simpleSelector(stream : TokenStream) : string {
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
            functionCallDoNothing,
        )
    )(stream);
}

function functionCallDoNothing(stream : TokenStream) : ReturnType<TokenParser> {
    sequence(
        ident,
        noSpacesHere,
        roundBracket,
    )(stream);
}

/**
 * implements:
 * media
  : MEDIA_SYM S* media_list '{' S* ruleset* '}' S*
  ;
 *
 * */
function mediaStatement(stream : TokenStream) : void {
    sequence(
        symbol(Symbols.at),
        noSpacesHere,
        keyword(Keywords.cssMedia),
        mediaList,
        block(TokenType.LazyBlock, rulesetStatement)
    )(stream);
}

/**
 * implements:
 * page
  : PAGE_SYM S* pseudo_page?
    '{' S* declaration? [ ';' S* declaration? ]* '}' S*
  ;
 *
 * */
function pageStatement(stream : TokenStream) : void {
    sequence(
        symbol(Symbols.at),
        noSpacesHere,
        keyword(Keywords.cssPage),
        optional(pseudoPage),
        block(TokenType.LazyBlock, list(
            declaration,
            symbol(Symbols.semicolon),
            true, // list can be empty
        ))
    )(stream);
}

/**
 * implements:
 * pseudo_page
  : ':' IDENT S*
  ;
 *
 * */
function pseudoPage(stream : TokenStream) : void {
    sequence(
        symbol(Symbols.colon),
        noSpacesHere,
        ident,
    )(stream);
}
