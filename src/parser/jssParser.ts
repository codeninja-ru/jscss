import { Keywords, ReservedWords } from "keywords";
import { Symbols } from "symbols";
import { LiteralToken, TokenType } from "token";
import { attrib, combinator, cssCharset, cssLiteral, hash, importStatement, pageStatement, pseudo } from "./cssParser";
import { assignmentExpression, identifier, moduleItem, numericLiteral, parseComment } from "./parser";
import { SequenceError, SyntaxRuleError } from "./parserError";
import { anyBlock, anyString, block, comma, commaList, dollarSign, firstOf, ignoreSpacesAndComments, keyword, lazyBlock, LazyBlockParser, leftHandRecurciveRule, loop, noLineTerminatorHere, noSpacesHere, oneOfSymbols, optional, returnRawValue, returnRawValueWithPosition, semicolon, sequence, sequenceWithPosition, strictLoop, symbol } from "./parserUtils";
import { BlockNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssMediaNode, JssSelectorNode, JssSpreadNode, JssVarDeclarationNode, NodeType, SyntaxTree } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { peekNextToken } from "./tokenStreamReader";

export function parseJssScript(stream : TokenStream) : SyntaxTree {
    optional(skipShebang)(stream);
    return strictLoop(jssStatement)(stream);
}

const templatePlaceholder = sequence(dollarSign, noSpacesHere, anyBlock); // template string ${}

function jssSpreadDefinition(stream : TokenStream) : JssSpreadNode {
    const [, value] = sequence(symbol(Symbols.dot3), returnRawValueWithPosition(assignmentExpression))(stream);

    return {
        type: NodeType.JssSpread,
        value: value.value,
        valuePos: value.position,
    };
}

/**
 * can contain and be started with '-'
 * */
export function jssPropertyName(stream : TokenStream) : void {
    return firstOf(
        // LiteralPropertyName
        cssLiteral,
        anyString,
        numericLiteral,
        // ComputedPropertyName[?Yield, ?Await]
        block(TokenType.SquareBrackets, assignmentExpression)
    )(stream);
}

function jsProperyDefinition(stream : TokenStream) : JssDeclarationNode {
    //sequence(propertyName, symbol(Symbols.colon), assignmentExpression), // clear js assigment
    //sequence(propertyName, symbol(Symbols.colon), expr, optional(prioStatement)), // clear css
    const [propName,,value] = sequence(
        jssPropertyName,
        symbol(Symbols.colon),
        returnRawValueWithPosition(loop(
            firstOf(
                templatePlaceholder, // template string ${}
                cssLiteral,
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
        ))
    )(stream);

    return {
        type: NodeType.JssDeclaration,
        //TODO string in properyName should be fobiddne
        prop: propName.type == TokenType.String ? propName.value.slice(1, propName.value.length - 1) : propName.value,
        propPos: propName.position,
        value: value.value,
        valuePos: value.position,
    };
}

function jssPropertyDefinition(stream : TokenStream) : (JssDeclarationNode | JssSpreadNode) {
    const result = firstOf(
        jsProperyDefinition,
        jssSpreadDefinition,
    )(stream);

    optional(semicolon)(stream);

    return result;
}

function jssIdent(stream : TokenStream) : string {
    return returnRawValue(leftHandRecurciveRule(
        firstOf(
            templatePlaceholder,
            cssLiteral,//NOTE it can't be started with numbers, and content some chars, read the spec
        ),
        sequence(noSpacesHere, jssIdent),
    ))(stream);
}

export function simpleSelector(stream : TokenStream) : string {
    const elementName = returnRawValue(firstOf(jssIdent, symbol(Symbols.astersik)));
    const cssClass = sequence(symbol(Symbols.dot), noSpacesHere, jssIdent);
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

export function selector(stream : TokenStream) : JssSelectorNode {
    const firstSelector = returnRawValueWithPosition(simpleSelector)(stream);
    let result = [firstSelector.value];
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
        type: NodeType.JssSelector,
        items: result,
        position: firstSelector.position,
    };
}

/**
 * implements:
 * const varName = new {
 *   someCss: rule;
 * }
 *
 * */
function jssVariableStatement(stream : TokenStream) : JssVarDeclarationNode {
    const exportKeyword = optional(keyword(Keywords._export))(stream);
    const [decKeyword, varName,,,,block] = sequenceWithPosition(
        firstOf(
            keyword(Keywords._const),
            keyword(Keywords._let),
            keyword(Keywords._var),
        ),
        identifier,
        symbol(Symbols.eq),
        keyword(Keywords._new),
        noLineTerminatorHere,
        jssBlockStatement,
    )(stream);

    if (varName.value in {"self" : 1, "_styles" : 1, "JssStylesheet" : 1, "JssStyleBlock" : 1, "JssBlock": 1}) {
        throw new SequenceError(
            new SyntaxRuleError(`${varName.value} is a reseved word`, varName.position),
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
        ...(exportKeyword !== undefined ? { exportPos: exportKeyword.position } : {})
    };
}

function jssBlockStatement(stream : TokenStream) : LazyBlockParser<BlockNode<JssBlockItemNode>> {
    return lazyBlock(TokenType.LazyBlock, strictLoop(firstOf(
        ignoreSpacesAndComments,
        jssPropertyDefinition,
        rulesetStatement,
    )))(stream);
}

export function rulesetStatement(stream : TokenStream) : JssBlockNode {
    const selectors = commaList(selector)(stream) as JssSelectorNode[];
    const cssBlock = jssBlockStatement(stream);

    if (selectors.length == 1) {
        const firstSelector = selectors[0].items[0];

        if (firstSelector in ReservedWords) {
            throw new SequenceError(
                new SyntaxRuleError(`"${firstSelector}" is a reseved word, it's not allowed as a selector`, selectors[0].position)
            );
        }
    }

    return {
        type: NodeType.JssBlock,
        selectors,
        position: selectors[0].position,
        items: cssBlock.parse().items,
    };
}

function jssMediaList(stream : TokenStream) : LiteralToken[] {
    return commaList(jssIdent)(stream);
}

export function jssMediaStatement(stream : TokenStream) : JssMediaNode {
    const [at,,,] = sequence(
        symbol(Symbols.at, peekNextToken),
        keyword(Keywords.cssMedia),
    )(stream);

    const mediaListItems = jssMediaList(stream).map((token : LiteralToken) => token.value);
    const rules = block(TokenType.LazyBlock, strictLoop(
        firstOf(
            ignoreSpacesAndComments,
            rulesetStatement,
            jssVariableStatement,
    )))(stream);

    return {
        type: NodeType.JssMedia,
        mediaList: mediaListItems,
        position: at.position,
        items: rules,
    };
}

export function stylesheetItem(stream : TokenStream) : ReturnType<TokenParser> {
    //TODO everything that starts with @ can be optimized by combining together
    return firstOf(
        cssCharset,
        importStatement,
        rulesetStatement,
        jssMediaStatement,
        pageStatement,
        jssVariableStatement,
    )(stream);
}

/**
 * implements:
 * js + css
 *
 * */
function jssStatement(stream : TokenStream) : ReturnType<TokenParser> {
    return firstOf(
        //TODO optimaze the list of statements (it's possible to take sub funstions and put the rules here)
        ignoreSpacesAndComments, //TODO it's duplicated in stylesheeiItem
        stylesheetItem,
        moduleItem,
        parseComment,
    )(stream);
}

/**
 * implements:
 * shebang:
 *  # (any token that is not line terminator)
 *
 * */
function skipShebang(stream : TokenStream) : void {
    symbol(Symbols.numero)(stream);

    while(!stream.eof()) {
        const token = stream.next();

        if (token.type == TokenType.Space && token.value.indexOf('\n') != -1) {
            break;
        }
    }
}
