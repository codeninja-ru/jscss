import { Keywords, ReservedWords } from "keywords";
import { Position } from "stream/position";
import { Symbols } from "symbols";
import { HiddenToken, LiteralToken, SymbolToken, TokenType } from "token";
import { attrib, combinator, cssCharset, cssLiteral, hash, importStatement, mediaQuery, mediaQueryList, pageSelectorList, term } from "./cssParser";
import { expression, functionExpression, identifier, moduleItem, parseJsVarStatement } from "./parser";
import { ParserError, SequenceError, SyntaxRuleError } from "./parserError";
import { andRule, anyBlock, anyLiteral, anyString, block, commaList, endsWithOptionalSemicolon, firstOf, ignoreSpacesAndComments, isBlockNode, isLazyBlockParser, keyword, lazyBlock, LazyBlockParser, leftHandRecurciveRule, literalKeyword, multiSymbol, noLineTerminatorHere, noSpacesHere, notAllowed, oneOfSimpleSymbols, optional, optionalBool, probe, rawValue, repeat, returnRawValueWithPosition, roundBracket, semicolon, sequence, sequenceVoid, sequenceWithPosition, strictLoop, symbol } from "./parserUtils";
import { isCssToken, isLiteralNextToken, isSquareBracketNextToken, isSymbolNextToken, makeIsKeywordNextTokenProbe, makeIsSymbolNextTokenProbe } from "./predicats";
import { isSourceFragment } from "./sourceFragment";
import { CssCharsetNode, CssImportNode, CssMediaNode, CssPageNode, CssRawNode, FontFaceNode, JsRawNode, JssAtRuleNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssNode, JssPageNode, JssSelectorNode, JssSpreadNode, JssSupportsNode, JssVarDeclarationNode, NodeType, SyntaxTree } from "./syntaxTree";
import { NextToken, TokenParser } from "./tokenParser";
import { LookAheadTokenStream, TokenStream } from "./tokenStream";
import { peekAndSkipSpaces, peekNextToken } from "./tokenStreamReader";
import { OneOfArray, ReturnTypeMap } from "./types";


export function parseJssScript(stream : TokenStream) : SyntaxTree {
    optionalBool(skipShebang)(stream);
    return strictLoop(jssStatement)(stream);
}

const templatePlaceholder = sequence(symbol(Symbols.dollar), noSpacesHere, anyBlock); // template string ${}
templatePlaceholder.probe = makeIsSymbolNextTokenProbe(Symbols.dollar);

/**
 * add vendor prefix to keywordParser
 *
 * vendorPrfixes:
 * -webkit-
 * -moz-
 * -o-
 * -ms-
 *
 * */
function withVendorPrefix(keywordParser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        firstOf(
            probe(
                sequenceVoid(
                    symbol(Symbols.minus),
                    firstOf(
                        literalKeyword('webkit', peekNextToken),
                        literalKeyword('moz', peekNextToken),
                        literalKeyword('o', peekNextToken),
                        literalKeyword('ms', peekNextToken),
                    ),
                    symbol(Symbols.minus, peekNextToken),
                    noSpacesHere,
                    keywordParser,
                ),
                makeIsSymbolNextTokenProbe(Symbols.minus),
            ),
            keywordParser,
        )(stream);
    };
}

function pseudo(stream : TokenStream) : string {
    symbol(Symbols.colon)(stream);
    let result = ':';
    const optColon = optional(symbol(Symbols.colon, peekNextToken))(stream);
    if (optColon) {
        result += ':';
    }
    const name = jssIdent(stream);
    result += name.value;
    const funcCall = optional( //functionalCall
        sequence(
            noSpacesHere,
            roundBracket //TODO parse
        )
    )(stream);

    if (funcCall) {
        result += funcCall[1].value;
    }

    return result;
}
pseudo.probe = makeIsSymbolNextTokenProbe(Symbols.colon);

function toRawNode(parser : TokenParser) : TokenParser<JsRawNode> {
    return function(stream : TokenStream) : JsRawNode {
        const value = returnRawValueWithPosition(parser)(stream);

        return {
            type: NodeType.Raw,
            value: value.value,
            position: value.position,
        }
    }
}

function jssSpreadDefinition(stream : TokenStream) : JssSpreadNode {
    const [, value] = sequence(multiSymbol(Symbols.dot3), returnRawValueWithPosition(expression))(stream);

    return {
        type: NodeType.JssSpread,
        value: value.value,
        valuePos: value.position,
    };
}
jssSpreadDefinition.probe = makeIsSymbolNextTokenProbe(Symbols.dot);

/**
 * can contain and be started with '-'
 * cannot be a reserved word
 * */
export function jssPropertyName(stream : TokenStream) : any {
    return firstOf(
        // LiteralPropertyName
        probe(
            function(stream : TokenStream) {
                const name = jssIdent(stream);
                if (name.value in ReservedWords) {
                    throw SequenceError.reuse(
                        SyntaxRuleError.reuse(`"${name.value}" is a reserved word, it's not allowed as a property name`, name.position)
                    );
                }
                return name;
            },
            jssIdent.probe,
        ),
        anyString,
        //numericLiteral,
        // ComputedPropertyName[?Yield, ?Await]
        block(TokenType.SquareBrackets, returnRawValueWithPosition(expression)),
    )(stream);
}

/**
 *
 *   return firstOf(
 *       templatePlaceholder, // template string ${}
 *       cssLiteral,
 *       anyString,
 *       numericLiteral,
 *       roundBracket,
 *       ////TODO url

 *       oneOfSimpleSymbols(
 *           Symbols.comma,
 *           Symbols.plus,
 *           Symbols.minus,
 *           Symbols.astersik,
 *           Symbols.not,
 *           Symbols.div,
 *           Symbols.backslash,
 *           Symbols.dot,
 *           Symbols.numero,
 *           Symbols.percent,
 *           Symbols.colon,
 *           Symbols.question,
 *           Symbols.bitwiseAnd,
 *       ),
 *   )(stream);
 * */
function jssPropertyValue(stream : TokenStream) : any {

        return returnRawValueWithPosition(repeat( //jssPropertyValue
            (stream : TokenStream) => {
                const parserStream = new LookAheadTokenStream(stream);
                const token = peekAndSkipSpaces(parserStream);
                if (Symbols.dollar.equal(token)) {
                    return templatePlaceholder(stream);
                }

                if (token.type == TokenType.String) {
                    return anyString(stream);
                }

                if (token.type == TokenType.RoundBrackets) {
                    return roundBracket(stream);
                }

                if (token.type == TokenType.Symbol) {
                    switch(token.value) {
                        case ',':
                        case '+':
                        case '-':
                        case '*':
                        case '!':
                        case '/':
                        case '\\':
                        case '.':
                        case '#':
                        case '%':
                        case ':':
                        case '?':
                        case '&':
                            parserStream.flush();
                            return token;
                        default:
                            throw ParserError.reuse('unexpected symbol in jssPropertyValue', token);

                    }
                }

                return anyLiteral(stream);
            }
        ))(stream);
}

function jssPropertyDefinition(stream : TokenStream) : JssDeclarationNode {
    //sequence(propertyName, symbol(Symbols.colon), assignmentExpression), // clear js assigment
    //sequence(propertyName, symbol(Symbols.colon), expr, optional(prioStatement)), // clear css
    const [propNameToken,,value] = sequence(
        jssPropertyName,
        symbol(Symbols.colon),
        jssPropertyValue,
    )(stream);

    let propName = null;
    let propPos = propNameToken.position;
    if (isBlockNode(propNameToken)) {
        if (isSourceFragment(propNameToken.items)) {
            propName = '${' + propNameToken.items.value + '}';
            propPos = propNameToken.items.position;
        } else {
            throw new Error('block should contain a sourceFragment')
        }
    } else if (propNameToken.type && propNameToken.type == TokenType.String) {
        propName = propNameToken.value.slice(1, propNameToken.value.length - 1);
    } else {
        propName = propNameToken.value;
    }

    return {
        type: NodeType.JssDeclaration,
        //TODO string in properyName should be fobiddne
        prop: propName,
        propPos: propPos,
        value: value.value,
        valuePos: value.position,
    };
}

export function jssIdent(stream : TokenStream) : HiddenToken {
    const result = returnRawValueWithPosition(leftHandRecurciveRule(
        firstOf(
            templatePlaceholder,
            cssLiteral,//NOTE it can't be started with numbers, and content some chars, read the spec
        ),
        sequenceVoid(noSpacesHere, firstOf(
            templatePlaceholder,
            cssLiteral,
        )),
    ))(stream);

    return {
        type: TokenType.HiddenToken,
        position: result.position,
        value: result.value,
    };
}
jssIdent.probe = function(token : NextToken) : boolean {
    return Symbols.dollar.equal(token.token) || isCssToken(token.token);
}

function elementName(stream : TokenStream) : HiddenToken | SymbolToken {
    const token = firstOf(jssIdent,
            oneOfSimpleSymbols([
                Symbols.astersik, // universal selecotr
                Symbols.bitwiseAnd, // nesting selector
            ]))(stream);

    return token;
}
elementName.probe = function(token : NextToken) : boolean {
    return jssIdent.probe(token)
        || (Symbols.astersik.equal(token.token) || Symbols.bitwiseAnd.equal(token.token));
}

function cssClass(stream : TokenStream) : string {
    const dot = symbol(Symbols.dot)(stream);
    noSpacesHere(stream);
    const name = jssIdent(stream);

    return dot.value + name.value;
}
cssClass.probe = makeIsSymbolNextTokenProbe(Symbols.dot);

export function simpleSelector(stream : TokenStream) : string {
    const optionalElementName = optional(elementName);
    const rest = firstOf(
        hash,
        cssClass,
        attrib,
        pseudo,
    );
    const restNoSpace = function(stream : TokenStream) : string {
        noSpacesHere(stream);
        return rest(stream);
    };

    const name = optionalElementName(stream);
    if (name) {
        return name.value + repeat(restNoSpace)(stream).join('');
    } else {
        return rest(stream) + repeat(restNoSpace)(stream).join('');
    }
}
simpleSelector.probe = (nextToken : NextToken) : boolean => jssIdent.probe(nextToken)
    || isSymbolNextToken(nextToken) || isSquareBracketNextToken(nextToken);

export function jssSelector(stream : TokenStream) : JssSelectorNode {
    //TODO check if it's possible replace RawValue to ValueWithPosition (for optimization)
    const firstSelector = returnRawValueWithPosition(simpleSelector)(stream);
    let result = [firstSelector.value];
    const optionalCombinator = optional(combinator);
    const optionalSelector = optional(simpleSelector);
    while(!stream.eof()) {
        const comb = optionalCombinator(stream);
        const sel = optionalSelector(stream);

        if (comb && sel) {
            result.push(comb.value, sel);
        } else if (sel) {
            result.push(sel);
        } else if (comb) {
            throw ParserError.reuse(`unexpected combinator`, comb);
        } else {
            break;
        }
    }

    return {
        type: NodeType.JssSelector,
        items: result,
        position: firstSelector.position,
    };
}
jssSelector.probe = simpleSelector.probe;

/**
 * implements:
 * const varName = new {
 *   someCss: rule;
 * }
 *
 *
 * */
function jssVariableStatement(stream : TokenStream) : JssVarDeclarationNode {
    //NOTE it's overlapped with jsVariableStatement (can be optimaized)
    const exportKeyword = optional(keyword(Keywords._export))(stream);
    const [decKeyword, varName,,,,block] = sequenceWithPosition(
        firstOf(
            keyword(Keywords._const),
            keyword(Keywords._let),
            keyword(Keywords._var),
        ),
        identifier,
        symbol(Symbols.eq),
        firstOf(
            // TODO remove new
            keyword(Keywords._new), // @deprecated we should not use new not to cause any ambiguousness
            sequence(symbol(Symbols.at), keyword(Keywords.jssBlock))
        ),
        noLineTerminatorHere,
        jssBlockStatement,
        optional(symbol(Symbols.semicolon)),
    )(stream);

    if (varName.value in {"self" : 1, "_styles" : 1, "JssStylesheet" : 1, "JssStyleBlock" : 1, "JssBlock": 1}) {
        throw SequenceError.reuse(
            // TODO there is no point in the second (cause) exception
            SyntaxRuleError.reuse(`${varName.value} is a reserved word`, varName.position),
        );
    }

    return {
        type: NodeType.JssVarDeclaration,
        keyword: decKeyword.value,
        keywordPos: decKeyword.position,
        name: varName.value,
        namePos: varName.position,
        items: block.value.parse().items,
        hasExport: exportKeyword !== undefined,
        ...(exportKeyword ? { exportPos: exportKeyword.position } : {})
    };
}
jssVariableStatement.probe = isLiteralNextToken;

function jssBlockStatement(stream : TokenStream) : LazyBlockParser<JssBlockItemNode[]> {
    return lazyBlock(TokenType.LazyBlock, strictLoop(firstOf(
        ignoreSpacesAndComments,
        function(stream : TokenStream) : JssDeclarationNode | JssBlockNode {
            const rulesetStream = new LookAheadTokenStream(stream);
            const prop = jssPropertyDefinition(stream);
            const semi = optional(semicolon)(stream);

            if (semi == undefined) {
                //NOTE checking for conflicts
                const block = optional(rulesetStatement)(rulesetStream);

                if (block) {
                    rulesetStream.flush();
                    return block;
                }
            }
            return prop;
        },
        rulesetStatement,
        endsWithOptionalSemicolon(jssSpreadDefinition),
        startsWithDog(
            jssMediaStatement,
            supportsStatement,
            andRule(
                notAllowed(fontFaceKeyword, '@font-face is not allowed inside blocks'),
                notAllowed(keyword(Keywords.cssKeyframes), '@keyframes is not allowed inside blocks'),
                notAllowed(keyword(Keywords.cssNamespace), '@namespace is not allowed inside blocks'),
                notAllowed(keyword(Keywords.cssCharset), '@charset is not allowed inside blocks'),
                atRule,
            )
        ),
        jssVariableStatement, //TODO forbide exports
        toRawNode(parseJsVarStatement),
        toRawNode(functionExpression),
        //TODO add js statements
    )))(stream);
}

export function rulesetStatement(stream : TokenStream) : JssBlockNode {
    const selectors = commaList(jssSelector)(stream) as JssSelectorNode[];
    const jssBlock = jssBlockStatement(stream);

    if (selectors.length == 1) {
        const firstSelector = selectors[0].items[0];

        if (firstSelector in ReservedWords) {
            throw SequenceError.reuse(
                SyntaxRuleError.reuse(`"${firstSelector}" is a reserved word, it's not allowed as a selector`, selectors[0].position)
            );
        }
    }

    return {
        type: NodeType.JssBlock,
        selectors,
        position: selectors[0].position,
        items: jssBlock.parse().items,
    };
}
rulesetStatement.probe = simpleSelector.probe;

export function jssMediaStatement(stream : TokenStream) : JssAtRuleNode {
    const start = keyword(Keywords.cssMedia)(stream);

    try {
        const mediaListItems = mediaQueryList(stream).map((item) => item.trim());
        const rules = jssBlockStatement(stream);

        return {
            type: NodeType.JssAtRule,
            name: '@media',
            mediaList: mediaListItems,
            items: rules.parse().items,
            position: start.position,
        };
    } catch(e) {
        throw SequenceError.reuse(e);
    }
}
jssMediaStatement.probe = makeIsKeywordNextTokenProbe(Keywords.cssMedia);

/**
 * implements:
 * font-face
 *
 * */
function fontFaceKeyword(stream : TokenStream) : LiteralToken {
    const [start, ,,] = sequence(
        literalKeyword('font', peekNextToken),
        symbol(Symbols.minus, peekNextToken),
        literalKeyword('face', peekNextToken),
    )(stream);

    return {
        type: TokenType.Literal,
        position: start.position,
        value: 'font-face',
    };
}

function fontFace(stream : TokenStream) : FontFaceNode {
    const [start, block] = sequence(
        fontFaceKeyword,
        lazyBlock(TokenType.LazyBlock, strictLoop(
            firstOf(
                ignoreSpacesAndComments,
                endsWithOptionalSemicolon(jssPropertyDefinition),
                endsWithOptionalSemicolon(jssSpreadDefinition),
            )
        ))
    )(stream);

    return {
        type: NodeType.CssFontFace,
        position: start.position,
        items: block.parse().items,
    }
}
fontFace.probe = makeIsKeywordNextTokenProbe(Keywords.cssFont);

function atRule(stream : TokenStream) : JssAtRuleNode {
    const start = cssLiteral(stream);
    const mediaListItems = mediaQueryList(stream).map((item) => item.trim());
    const rules = firstOf(
        jssBlockStatement,
        semicolon,
    )(stream);

    return {
        type: NodeType.JssAtRule,
        name: '@' + start.value,
        mediaList: mediaListItems,
        items: isLazyBlockParser(rules) ? rules.parse().items : [],
        position: start.position,
    };
}

function pageStatement(stream : TokenStream) : JssPageNode {
    keyword(Keywords.cssPage)(stream);
    const pageSelectors = optional(pageSelectorList)(stream);
    const declarationList = lazyBlock(TokenType.LazyBlock, strictLoop(
        firstOf(
            ignoreSpacesAndComments,
            endsWithOptionalSemicolon(jssPropertyDefinition),
            endsWithOptionalSemicolon(jssSpreadDefinition),
        )
    ))(stream);

    return {
        type: NodeType.JssPage,
        pageSelectors: pageSelectors ? pageSelectors : [],
        items: declarationList.parse().items,
        position: Position.ZERO, // NOTE: it's going to be fixed in the startsWithDog
    };
}
pageStatement.probe = makeIsKeywordNextTokenProbe(Keywords.cssPage);

/**
 * Implements:
 *
  namespace =
  @namespace <namespace-prefix>? [ <string> | <url> ] ;
 * */
function namespaceStatement(stream : TokenStream) : CssRawNode {
    sequenceVoid(
        keyword(Keywords.cssNamespace),
        // <namespace-prefix> = <ident>
        firstOf(
            // <url> =
            // url( <string> <url-modifier>* )  |
            // src( <string> <url-modifier>* )
            //TODO add template placehoders
            sequenceVoid(
                cssLiteral,
                firstOf(
                    anyString,
                    sequenceVoid(cssLiteral, roundBracket),
                    roundBracket,
                )
            ),
            anyString,
        ),
        semicolon,
    )(stream);

    const source = rawValue(stream);

    return {
        type: NodeType.CssRaw,
        value: '@' + source.value,
        position: source.position,
    };
}
namespaceStatement.probe = makeIsKeywordNextTokenProbe(Keywords.cssNamespace);

/**
 * implements:
 *@keyframes =
  @keyframes <keyframes-name> { <rule-list> }
 *
 * */
function keyframesStatement(stream : TokenStream) : CssRawNode {
    sequenceVoid(
        withVendorPrefix(
            literalKeyword('keyframes'),
        ),
        cssLiteral,
        block(TokenType.LazyBlock, strictLoop(
            firstOf(
                ignoreSpacesAndComments,
                sequenceVoid(
                    firstOf(
                        literalKeyword('from'),
                        literalKeyword('to'),
                        term,
                    ),
                    jssBlockStatement,
                )
            )))
    )(stream);

    const source = rawValue(stream);

    return {
        type: NodeType.CssRaw,
        position: source.position,
        value: '@' + source.value,
    };
}

/**
 * implements:
 * @supports <supports-condition> { <stylesheet> }
 *
 * */
function supportsStatement(stream : TokenStream) : JssSupportsNode {
    const start = keyword(Keywords.cssSupports)(stream);
    const query = mediaQuery(stream);
    const rules = jssBlockStatement(stream);

    return {
        type: NodeType.JssSupports,
        query: query,
        position: start.position,
        items: rules.parse().items,
    };
}
supportsStatement.probe = makeIsKeywordNextTokenProbe(Keywords.cssSupports);


type StartsWithDogResult<R extends TokenParser[]> = OneOfArray<ReturnTypeMap<R>>;
type StartsWithDogNode = CssMediaNode | CssPageNode | CssCharsetNode
    | CssImportNode | JssAtRuleNode | CssRawNode | JssSupportsNode
    | FontFaceNode | JssPageNode;
/**
 * all rules that stat with @
 * */
function startsWithDog<R extends TokenParser<StartsWithDogNode>[]>(...rules : R) : TokenParser<StartsWithDogResult<R>> {
    return probe(function(stream : TokenStream) : StartsWithDogResult<R> {
        const dog = symbol(Symbols.at)(stream);
        noSpacesHere(stream);
        let result = firstOf(
            ...rules,
        )(stream); //TODO typescript is not able to derive type here, check for updates or bugs

        // @ts-ignore
        if (result.rawValue) {
            // @ts-ignore
            result.rawValue = '@' + result.rawValue;
        }

        //TODO get rid of ts-ignore here
        // @ts-ignore
        if (result.position) {
            // @ts-ignore
            result.position = dog.position;
        }

        return result;
    }, makeIsSymbolNextTokenProbe(Symbols.at));
}

/**
 * implements:
 * js + css
 *
 * */
function jssStatement(stream : TokenStream) : JssNode {
    return firstOf(
        ignoreSpacesAndComments,
        rulesetStatement,
        //TODO spread sheet def
        jssVariableStatement,
        endsWithOptionalSemicolon(jssPropertyDefinition),
        startsWithDog(
            cssCharset,
            importStatement,
            jssMediaStatement,
            namespaceStatement,
            keyframesStatement,
            supportsStatement,
            fontFace,
            pageStatement,
            atRule,
        ),
        moduleItem,
    )(stream);
}

/**
 * implements:
 * shebang:
 *  # (any token that is not line terminator)
 *
 * */
function skipShebang(stream : TokenStream) : void {
    multiSymbol(Symbols.shebang)(stream);

    while(!stream.eof()) {
        const token = stream.next();

        if (token.type == TokenType.Space && token.value.indexOf('\n') != -1) {
            break;
        }
    }
}
