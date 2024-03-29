import { Position } from "stream/position";
import { MultiSymbol, SyntaxSymbol } from "symbols";
import { SpaceToken, Token, TokenType } from "token";
import { ParserError } from "./parserError";
import { anyLiteral, anySpace, anyString, anySymbol, firstOf, literalKeyword, map, multiSymbol, noLineTerminatorHere, optional, repeatUntil, returnRawValue, returnRawValueWithPosition, sequence, skip, strictLoop, symbol } from "./parserUtils";
import { makeIsSymbolNextTokenProbe } from "./predicats";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { peekNextToken, peekNoLineTerminatorHere } from "./tokenStreamReader";

export enum MarkdownNodeType {
    P,
    H1, H2, H3, H4, H5, H6,
    URL,
    SOURCE_CODE,
    QUOTE,
}

interface MarkdownNode {
    readonly type: MarkdownNodeType;
    readonly value: string;
}

export interface PMarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.P;
}

export interface H1MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H1;
}

export interface H2MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H2;
}

export interface H3MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H3;
}

export interface H4MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H4;
}

export interface H5MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H5;
}

export interface H6MarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.H6;
}

export interface UrlMarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.URL;
}

export interface SourceCodeMarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.SOURCE_CODE;
    readonly lang : string;
    readonly position: Position;
    readonly title? : string;
}

export interface QuoteMarkdownNode extends MarkdownNode {
    type: MarkdownNodeType.QUOTE;
}

export const MarkdownSymbols = {
    numero: new SyntaxSymbol('#'),
    eq: new SyntaxSymbol('='),
    quote1: new SyntaxSymbol('`'),
    quote3: new MultiSymbol('```'),
    singleQuote: new SyntaxSymbol("'"),
    doubleQuote: new SyntaxSymbol('"'),
}

type HeaderMarkdownNode = H1MarkdownNode | H2MarkdownNode | H3MarkdownNode | H4MarkdownNode | H5MarkdownNode | H6MarkdownNode;
type HeaderMarkdownNodeType = MarkdownNodeType.H1 | MarkdownNodeType.H2 | MarkdownNodeType.H3 | MarkdownNodeType.H4 | MarkdownNodeType.H5 | MarkdownNodeType.H6;

function header(stream : TokenStream) : HeaderMarkdownNode {
    let level = 0;
    symbol(MarkdownSymbols.numero)(stream);
    level++;
    while(!stream.eof()) {
        const token = stream.peek();

        if (MarkdownSymbols.numero.equal(token)) {
            stream.next();
            level++;
        } else {
            break;
        }
    }

    let nodeType : HeaderMarkdownNodeType;
    switch(level) {
        case 1:
            nodeType = MarkdownNodeType.H1;
            break;
        case 2:
            nodeType = MarkdownNodeType.H2;
            break;
        case 3:
            nodeType = MarkdownNodeType.H3;
            break;
        case 4:
            nodeType = MarkdownNodeType.H4;
            break;
        case 5:
            nodeType = MarkdownNodeType.H5;
            break;
        case 6:
            nodeType = MarkdownNodeType.H6;
            break;
        default:
            throw ParserError.reuse(`header level ${level} is not supported`, stream.peek());
    }

    optional(anySpace)(stream);

    const value = returnRawValue(
        repeatUntil(
            firstOf(
                anyLiteral,
                anySpace,
                anySymbol,
            ),
            endOfLine
        )
    )(stream);


    return {
        type: nodeType,
        value: value.trimLeft(),
    }
}
header.probe = makeIsSymbolNextTokenProbe(MarkdownSymbols.numero);

function endOfLine(stream : TokenStream) : void {
    const token = stream.next();

    if (isEndOfLineToken(token)) {
        return;
    }

    throw ParserError.reuse('end of line is expected', token);
}

function simpleString(quote : SyntaxSymbol) : TokenParser<string> {
    return function(stream : TokenStream) : string {
        return map(
            sequence(
                symbol(quote),
                returnRawValue(
                    repeatUntil(firstOf(
                        anyLiteral,
                        anySpace,
                        anySymbol,
                    ), symbol(quote, peekNoLineTerminatorHere))
                ),
                symbol(quote),
            ),
            ([,str]) => str
        )(stream);
    };
}

function sourceCode(stream : TokenStream) : SourceCodeMarkdownNode {
    multiSymbol(MarkdownSymbols.quote3)(stream);
    const lang = anyLiteral(stream, peekNoLineTerminatorHere);
    const title = optional(
        map(
            sequence(
                literalKeyword('title', peekNoLineTerminatorHere),
                symbol(MarkdownSymbols.eq, peekNoLineTerminatorHere),
                noLineTerminatorHere,
                firstOf(
                    simpleString(MarkdownSymbols.singleQuote),
                    simpleString(MarkdownSymbols.doubleQuote),
                )
            ),
            ([,,, str]) => str,
        )
    )(stream);

    const value = returnRawValueWithPosition(
        repeatUntil(
            firstOf(
                anySpace,
                anyString,
                anyLiteral,
                anySymbol,
            ),
            multiSymbol(MarkdownSymbols.quote3, peekNextToken)
        )
    )(stream);

    multiSymbol(MarkdownSymbols.quote3)(stream);

    return {
        type: MarkdownNodeType.SOURCE_CODE,
        lang: lang.value,
        value: value.value.trim(),
        position: value.position,
        title: title,
    };
}
sourceCode.probe = makeIsSymbolNextTokenProbe(MarkdownSymbols.quote1);

function beginningOfStream(stream : TokenStream) : void {
    if (stream.currentPosition() == 0) {
        return;
    }

    throw ParserError.reuse('beigging of the stream is expected', stream.peek());
}

function isEndOfLineToken(token : Token) : boolean {
    return token.value.indexOf('\n') !== -1;
}

function countOfChar(str : string, needle : string) : Number {
    let pos = -1;
    let count = 0;
    while((pos = str.indexOf(needle, pos + 1)) !== -1) { count++ };

    return count;
}

function endOfBlock(stream : TokenStream) : SpaceToken {
    const token = stream.next();

    if (token.type == TokenType.Space
        && countOfChar(token.value, '\n') > 1) {
        return token;
    }

    throw ParserError.reuse('end of block is expected', stream.peek());
}

function p(stream : TokenStream) : PMarkdownNode {
    firstOf( //TODO remove?
        endOfBlock,
        beginningOfStream,
    )(stream);

    const value = returnRawValue(
        repeatUntil(
            firstOf(
                anyLiteral,
                anySpace,
                anySymbol,
            ),
            firstOf(
                endOfBlock,
                sequence(endOfLine, firstOf(
                    multiSymbol(MarkdownSymbols.quote3),
                    multiSymbol(MarkdownSymbols.numero),
                ))
            )
        )
    )(stream);

    return {
        type: MarkdownNodeType.P,
        value,
    }
}

export type MarkdownSyntaxTree = MarkdownNode[];

export function parseMarkdown(stream : TokenStream) : MarkdownSyntaxTree {
    return strictLoop(firstOf(
        header,
        sourceCode,
        p,
        skip(anySpace),
    ))(stream);
}
