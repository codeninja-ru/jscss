// the spec is here https://www.w3.org/TR/CSS2/grammar.html#q25.0

import { Keywords } from "keywords";
import { Symbols } from "symbols";
import { TokenType } from "token";
import { anyLiteral, anyString, block, commaList, firstOf, ignoreSpacesAndComments, keyword, list, loop, map, noSpacesHere, oneOfSymbols, optional, rawValue, regexpLiteral, returnRawValue, roundBracket, semicolon, sequence, sequenceWithPosition, squareBracket, strictLoop, symbol } from "./parserUtils";
import { CssBlockNode, CssCharsetNode, CssDeclarationNode, CssImportNode, CssMediaNode, CssSelectorNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";

/**
 * implements:
 * [ CHARSET_SYM STRING ';' ]?
 *
 * */
export function cssCharset(stream : TokenStream) : CssCharsetNode {
    sequence(symbol(Symbols.at), noSpacesHere, keyword(Keywords.cssCharset), anyString, semicolon)(stream);

    const source = rawValue(stream);
    return {
        type: NodeType.CssCharset,
        rawValue: source.value,
        position: source.position,
    };
}


/**
 * implements:
 * stylesheet
  : [ CHARSET_SYM STRING ';' ]?
    [S|CDO|CDC]* [ import [ CDO S* | CDC S* ]* ]*
    [ [ ruleset | media | page ] [ CDO S* | CDC S* ]* ]*
  ;
 *
 * */
export function stylesheetItem(stream : TokenStream) : ReturnType<TokenParser> {
    //TODO everything that starts with @ can be optimized by combining together
    return firstOf(
        ignoreSpacesAndComments,
        cssCharset,
        importStatement,
        rulesetStatement,
        mediaStatement,
        pageStatement,
    )(stream);
}

export function parseCssStyleSheet(stream : TokenStream) : ReturnType<TokenParser> {
    return loop(stylesheetItem)(stream);
}

/**
 *impemnets:
 import
  : IMPORT_SYM S*
    [STRING|URI] S* media_list? ';' S*
  ;
 * */
export function importStatement(stream : TokenStream) : CssImportNode {
    const [,,,path,,] = sequence(
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

    const source = rawValue(stream);
    return {
        type: NodeType.CssImport,
        path,
        position: source.position,
        rawValue: source.value,
    };
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
function mediaList(stream : TokenStream) : string[] {
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
    const [selectors, cssBlock] = sequence(
        commaList(selector),
        block(TokenType.LazyBlock, strictLoop(
            firstOf(
                ignoreSpacesAndComments,
                declaration,
            )
        ))
    )(stream);

    return {
        type: NodeType.CssBlock,
        selectors,
        items: cssBlock.items
    }
}

/**
 * implements:
 * declaration
  : property ':' S* expr prio?
  ;
 *
 * */
export function declaration(stream : TokenStream) : CssDeclarationNode {
    const [property,,expression,prio] = sequenceWithPosition(
        ident,
        symbol(Symbols.colon),
        returnRawValue(expr),
        optional(prioStatement),
        optional(semicolon)
    )(stream);

    return {
        type: NodeType.CssDeclaration,
        prop: property.value,
        propPros: property.position,
        value: expression.value.trim(),
        valuePos: expression.position,
        ...(prio ? {prio: prio.value, prioPos: prio.position} : {})
    };
}

export const prioStatement = map(sequence(
        // prio
        // : IMPORTANT_SYM S*
        symbol(Symbols.not),
        keyword(Keywords.cssImportant),
    ), (item) => item.join(''));

/**
 * implements:
 * expr
  : term [ operator? term ]*
  ;
 *
 * */
export function expr(stream : TokenStream) : void {
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
            uri,
            ident,
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
 * */
export function selector(stream : TokenStream) : CssSelectorNode {
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
export function combinator(stream : TokenStream) : void {
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
 * */
export function simpleSelector(stream : TokenStream) : string {
    const elementName = returnRawValue(firstOf(ident, symbol(Symbols.astersik)));
    const cssClass = sequence(symbol(Symbols.dot), noSpacesHere, ident);
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

/**
 * implements:
 * "#"{name}		{return HASH;}
 *
 * */
export function hash(stream : TokenStream) : string {
    return returnRawValue(sequence(
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
export function attrib(stream : TokenStream) : string {
    return returnRawValue(squareBracket)(stream); //TODO parse the content
}

/**
 * implements:
 * pseudo
  : ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
  ;
 *
 * */
export function pseudo(stream : TokenStream) : string {
    return returnRawValue(sequence(
        symbol(Symbols.colon),
        firstOf(
            ident,
            functionCallDoNothing,
        )
    ))(stream);
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
export function mediaStatement(stream : TokenStream) : CssMediaNode {
    sequence(
        symbol(Symbols.at),
        noSpacesHere,
        keyword(Keywords.cssMedia),
    )(stream);

    const mediaListItems = mediaList(stream);
    const rules = block(TokenType.LazyBlock, strictLoop(
        firstOf(ignoreSpacesAndComments, rulesetStatement)
    ))(stream);

    return {
        type: NodeType.CssMedia,
        mediaList: mediaListItems,
        items: rules,
    };
}

/**
 * implements:
 * page
  : PAGE_SYM S* pseudo_page?
    '{' S* declaration? [ ';' S* declaration? ]* '}' S*
  ;
 *
 * */
export function pageStatement(stream : TokenStream) : void {
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
