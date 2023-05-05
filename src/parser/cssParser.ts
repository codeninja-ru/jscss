// the spec is here https://www.w3.org/TR/CSS2/grammar.html#q25.0
// updated grammar is here https://drafts.csswg.org/selectors-3/#grammar
// https://www.w3.org/TR/mediaqueries-3/#syntax

import { Keywords } from "keywords";
import { Position } from "stream/position";
import { Symbols } from "symbols";
import { LiteralToken, SymbolToken, TokenType } from "token";
import { ParserError } from "./parserError";
import { anyString, block, commaList, firstOf, ignoreSpacesAndComments, keyword, leftHandRecurciveRule, list, loop, noSpacesHere, oneOfSimpleSymbols, optional, rawValue, regexpLiteral, returnRawValue, returnRawValueWithPosition, roundBracket, semicolon, sequence, squareBracket, strictLoop, symbol } from "./parserUtils";
import { isCssToken, isSymbolNextToken, makeIsSymbolNextTokenProbe, makeIsTokenTypeNextTokenProbe } from "./predicats";
import { BlockNode, CssBlockNode, CssCharsetNode, CssDeclarationNode, CssImportNode, CssMediaNode, CssSelectorNode, NodeType, StringNode } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { peekAndSkipSpaces, peekNextToken } from "./tokenStreamReader";

/**
 * literal that can contain "-"
 * */
export function cssLiteral(stream: TokenStream) : LiteralToken {
    let firstToken = peekAndSkipSpaces(stream);
    let result = "";
    if (isCssToken(firstToken)) {
        result = firstToken.value;

        while(!stream.eof()) {
            const token = stream.peek();
            if (isCssToken(token)) {
                result += token.value;
                stream.next();
            } else {
                break;
            }

        }
    }

    if (result == "") {
        throw ParserError.reuse(`css literal is expected`, firstToken);
    } else {
        if (result.includes('$')) {
            throw ParserError.reuse(`css literal can't containt $`, firstToken);
        }
        return {
            type: TokenType.Literal,
            value: result,
            position: firstToken.position,
        };
    }
}

/**
 * implements:
 * [ CHARSET_SYM STRING ';' ]?
 *
 * */
export function cssCharset(stream : TokenStream) : CssCharsetNode {
    sequence(keyword(Keywords.cssCharset), anyString, semicolon)(stream);

    const source = rawValue(stream);
    return {
        type: NodeType.CssCharset,
        rawValue: source.value,
        position: source.position,
    };
}

/**
 * all rules that stat with @
 * */
function startsWithDog(stream : TokenStream) : any {
    const dog = symbol(Symbols.at)(stream);
    noSpacesHere(stream);
    let result = firstOf(
        cssCharset,
        importStatement,
        mediaStatement,
        pageStatement,
    )(stream);

    if (result.rawValue) {
        result.rawValue = '@' + result.rawValue;
    }

    if (result.position) {
        result.position = dog.position;
    }

    return result;
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
    return firstOf(
        ignoreSpacesAndComments,
        rulesetStatement,
        startsWithDog, //NOTE all rules started with @, we optimize the parsing and avoid dealing with the error in the sequences
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
    const [,path,,] = sequence(
        keyword(Keywords._import),
        firstOf(
            anyString,
            uri,
        ),
        optional(mediaQueryList),
        semicolon,
    )(stream);

    const source = rawValue(stream);
    return {
        type: NodeType.CssImport,
        path: path.value,
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
 * media_query_list
 *  : S* [media_query [ ',' S* media_query ]* ]?
 *  ;
 * @see https://www.w3.org/TR/mediaqueries-3/#syntax
 * The media_query_list production defined below replaces the media_list production from CSS2. [CSS21]
 * */
export function mediaQueryList(stream : TokenStream, canListBeEmpty = false) : any[] {
    return commaList(mediaQuery, canListBeEmpty)(stream);
}

/**
 * implements:
 *
 * media_query
 *  : [ONLY | NOT]? S* media_type S* [ AND S* expression ]*
 *  | expression [ AND S* expression ]*
 *  ;
 * */
export function mediaQuery(stream : TokenStream) : any {
    //TODO it might be a wrong implementation, check with tree-sitter-jsslang
    return firstOf(
        //  : [ONLY | NOT]? S* media_type S* [ AND S* expression ]*
        returnRawValue(leftHandRecurciveRule(
            sequence(
                optional(
                    firstOf(keyword(Keywords.cssOnly), keyword(Keywords.cssNot))
                ),
                mediaType,
            ),
            sequence(
                keyword(Keywords.cssAnd),
                expression,
            )
        )),
        //  | expression [ AND S* expression ]*
        returnRawValue(leftHandRecurciveRule(
            expression,
            sequence(
                keyword(Keywords.cssAnd),
                expression,
            )
        ))
    )(stream);
}

/**
 * implements:
 * media_type
 *  : IDENT
 *  ;
 * */
function mediaType(stream : TokenStream) : LiteralToken {
    return ident(stream);
}

/**
 * implements:
 *
 * expression
 *  : '(' S* media_feature S* [ ':' S* expr ]? ')' S*
 *  ;
 *
 * */
function expression(stream : TokenStream) : BlockNode {
    return block(TokenType.RoundBrackets, sequence(
        mediaFeature,
        optional(
            sequence(
                symbol(Symbols.colon),
                expr,
            )
        )
    ))(stream);
}

/**
 * implements:
 *
 * media_feature
 *  : IDENT
 *  ;
 *
 * */
function mediaFeature(stream : TokenStream) : LiteralToken {
    return ident(stream);
}

function ident(stream : TokenStream) : LiteralToken {
    //NOTE it can't be started with numbers, and content some chars, read the spec
    return cssLiteral(stream);
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
    const [property,,expression,prio] = sequence(
        ident,
        symbol(Symbols.colon),
        returnRawValueWithPosition(expr),
        optional(prioStatement),
        optional(semicolon)
    )(stream);

    return {
        type: NodeType.CssDeclaration,
        prop: property.value,
        propPos: property.position,
        value: expression.value,
        valuePos: expression.position,
        ...(prio ? {prio: prio.value, prioPos: prio.position} : {})
    };
}

export function prioStatement(stream : TokenStream) : StringNode {
    const [not,,,] = sequence(
        // prio
        // : IMPORTANT_SYM S*
        symbol(Symbols.not),
        noSpacesHere,
        keyword(Keywords.cssImportant),
    )(stream);

    return {
        position: not.position,
        value: "!important",
    };
}

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
            optional(oneOfSimpleSymbols([Symbols.div, Symbols.comma])),
            term,
        )
    )(stream);
}

const NUM_REG = /^[0-9]+$/;
function percentage(stream : TokenStream) : string {
    const num = optional(regexpLiteral(NUM_REG))(stream);
    let dot;
    if (num) {
        dot = optional(symbol(Symbols.dot, peekNextToken))(stream);
    } else {
        dot = optional(symbol(Symbols.dot))(stream);
    }
    let num2;

    if (dot) {
        num2 = regexpLiteral(NUM_REG, peekNextToken);
    }

    symbol(Symbols.percent, peekNextToken)(stream);

    return [num, dot, num2, '%'].filter(str => str != undefined).join('');
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
export function term(stream : TokenStream) : void {
    firstOf(
        // numbers
        sequence(
            optional(unaryOperator),
            firstOf(
                // PERCENTAGE
                percentage,
                // lengths
                sequence(
                    optional(
                        sequence(
                            optional(regexpLiteral(NUM_REG)),
                            symbol(Symbols.dot),
                        )
                    ),
                    regexpLiteral(/^[0-9]+(px|cm|mm|in|pt|pc|em|ex|deg|rad|grad|ms|s|hz|khz|dpi|dpcm)?$/g),
                )
            )
        ),
        // the rest
        anyString,
        uri,
        ident,
        sequence(symbol(Symbols.numero), noSpacesHere, cssLiteral),
        functionCallDoNothing,
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
    oneOfSimpleSymbols([Symbols.plus, Symbols.minus])(stream);
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
            result.push(comb.value, sel);
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
export function combinator(stream : TokenStream) : SymbolToken {
    return oneOfSimpleSymbols([
        Symbols.plus,
        Symbols.lt,
        Symbols.tilde,
    ])(stream);
}
combinator.probe = isSymbolNextToken;


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
    symbol(Symbols.numero)(stream);
    noSpacesHere(stream);
    // nmchar		[_a-z0-9-]|{nonascii}|{escape} //TODO test out
    const name = cssLiteral(stream);

    return '#' + name.value;
}
hash.probe = makeIsSymbolNextTokenProbe(Symbols.numero);

/**
 * implements:
 * attrib
  : '[' S* IDENT S* [ [ '=' | INCLUDES | DASHMATCH ] S*
    [ IDENT | STRING ] S* ]? ']'
  ;
 *
 * */
export function attrib(stream : TokenStream) : string {
    return squareBracket(stream).value; //TODO parse the content
}
attrib.probe = makeIsTokenTypeNextTokenProbe(TokenType.SquareBrackets);

/**
 * implements:
  pseudo
  // '::' starts a pseudo-element, ':' a pseudo-class
  // Exceptions: :first-line, :first-letter, :before and :after.
  // Note that pseudo-elements are restricted to one per selector and
  // occur only in the last simple_selector_sequence.
  : ':' ':'? [ IDENT | functional_pseudo ]
  ;

 *
 * */
export function pseudo(stream : TokenStream) : string {
    return returnRawValue(sequence(
        symbol(Symbols.colon),
        optional(symbol(Symbols.colon, peekNextToken)),
        firstOf(
            ident,
            functionCallDoNothing,
        )
    ))(stream);
}
pseudo.probe = makeIsSymbolNextTokenProbe(Symbols.colon);

/**
 *function
  : FUNCTION S* expr ')' S*
  ;
 * */
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
    keyword(Keywords.cssMedia)(stream);

    const mediaListItems = mediaQueryList(stream).map((item) => item.trim());
    const rules = block(TokenType.LazyBlock, strictLoop(
        firstOf(ignoreSpacesAndComments, rulesetStatement, mediaStatement)
    ))(stream);

    return {
        type: NodeType.CssMedia,
        mediaList: mediaListItems,
        items: rules.items,
        position: new Position(1, 1), // NOTE: it's going to be fixed in the startsWithDog
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
