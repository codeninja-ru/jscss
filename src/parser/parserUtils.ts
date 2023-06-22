import { Keyword } from "keywords";
import { jssLexer } from "lexer/jssLexer";
import { SubStringInputStream } from "stream/input/SubStringInputStream";
import { Position } from "stream/position";
import { MultiSymbol, Symbols, SyntaxSymbol } from "symbols";
import { ExtractType, isToken, LiteralToken, OneOfBlockToken, SpaceToken, SquareBracketsToken, StringToken, SymbolToken, TemplateStringToken, Token, TokenType } from "token";
import { BlockParserError, EmptyStreamError, LexerError, ParserError, SequenceError, UnexpectedEndError } from "./parserError";
import { isRoundBracketNextToken, isStringNextToken, isSymbolNextToken } from "./predicats";
import { LeftTrimSourceFragment, SourceFragment } from "./sourceFragment";
import { BlockNode, BlockType, IgnoreNode, LazyNode, NodeType } from "./syntaxTree";
import { NextNotSpaceToken, NextToken, ParsedSourceWithPosition, ProbeFn, TokenParser, TokenParserArrayWithPosition } from "./tokenParser";
import { ArrayTokenStream, FlushableTokenStream, LookAheadTokenStream, TokenStream } from "./tokenStream";
import { isSpaceOrComment, peekAndSkipSpaces, peekNextToken, TokenStreamReader } from "./tokenStreamReader";
import { NeverVoid, OneOfArray, ReturnTypeMap } from "./types";


export function noLineTerminatorHere(stream : TokenStream) : void {
    while(!stream.eof()) {
        const token = stream.peek();
        if (token.type == TokenType.Space) {
            if (token.value.indexOf('\n') === -1) {
                stream.next();
                continue;
            } else {
                throw ParserError.reuse('no line terminator here', token);
            }
        } else {
            break;
        }
    }
}

export function noSpacesHere(stream : TokenStream) : void {
    while(!stream.eof()) {
        const token = stream.peek();
        if (token.type == TokenType.Space) {
            throw ParserError.reuse('no spaces here', token);
        } else {
            break;
        }
    }
}

export function keyword(keyword: Keyword,
                        peekFn : TokenStreamReader = peekAndSkipSpaces): TokenParser<LiteralToken> {
    return function keywordInst(stream: TokenStream) : LiteralToken {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && keyword.equal(token)) {
            return token;
        } else {
            throw ParserError.reuse(`keyword "${keyword.name}" is expected`, token);
        }
    };
}

export function literalKeyword(keyword: string,
                        peekFn : TokenStreamReader = peekAndSkipSpaces): TokenParser<LiteralToken> {
    return function literalKeywordInst(stream: TokenStream) : LiteralToken {
        //TODO make it case insecitive
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && token.value == keyword) {
            return token;
        } else {
            throw ParserError.reuse(`keyword "${keyword}" is expected`, token);
        }
    };
}

export function comma(stream: TokenStream) : SymbolToken {
    const token = peekAndSkipSpaces(stream);
    if (Symbols.comma.equal(token)) {
        return token;
    }

    throw ParserError.reuse(`, is expected`, token);
}
comma.probe = isSymbolNextToken;

export function commaList<R>(parser: TokenParser<R>,
                          canListBeEmpty : boolean = false) : TokenParser<R[]> {
    return list(parser, comma, canListBeEmpty);
}

export function flushed(parser : TokenParser) : TokenParser {
    return function flushedInst(stream: TokenStream) : ReturnType<TokenParser> {
        const childStream = new LookAheadTokenStream(stream);
        let result;
        try {
            result = parser(childStream);
            childStream.flush();
        } catch(e) {
            throw e;
        }

        return result;
    };
}

export function isFlushableTokenStream(stream : TokenStream | FlushableTokenStream) : stream is FlushableTokenStream {
    return (stream as FlushableTokenStream).flush !== undefined;
}

export function rawValue(stream : TokenStream | FlushableTokenStream) : SourceFragment {
    if (isFlushableTokenStream(stream)) {
        return stream.sourceFragment();
    } else {
        throw new Error('could not obtain the rawValue')
    }
}

export function returnRawValueWithPosition(parser : TokenParser) : TokenParser<SourceFragment> {
    return function returnRawValueWithPositionInst(stream: TokenStream) : SourceFragment {
        const childStream = new LookAheadTokenStream(stream);
        parser(childStream);
        const result = new LeftTrimSourceFragment(childStream.sourceFragment());
        childStream.flush();

        return result;
    };
}

export class ValueWithPosition<R> {
    constructor(readonly value: NeverVoid<R>, readonly position: Position) {}
}

export function returnValueWithPosition<R>(parser : TokenParser<NeverVoid<R>>) : TokenParser<ValueWithPosition<R>> {
    return function returnValueWithPositionInst(stream: TokenStream) : ValueWithPosition<R> {
        const childStream = new LookAheadTokenStream(stream);
        const value = parser(childStream);
        const result = new LeftTrimSourceFragment(childStream.sourceFragment());
        childStream.flush();

        return new ValueWithPosition(value, result.position);
    };
}

export function returnRawValue(parser : TokenParser) : TokenParser<string> {
    return function returnRawValueInst(stream: TokenStream) : string {
        const childStream = new LookAheadTokenStream(stream);
        parser(childStream);
        const result = childStream.sourceFragment();
        childStream.flush();

        return result.value;
    };
}

export function list<S>(parser: TokenParser,
                     separator: TokenParser<NeverVoid<S>>,
                     canListBeEmpty : boolean = false) : TokenParser {
    const flushedParser = flushed(parser);
    const optionalSeperator = optionalBool(separator);
    return probe(function listInst(stream: TokenStream) : ReturnType<TokenParser> {
        let result = [];
        while (!stream.eof()) {
            if (parser.probe) {
                const nextToken = NextNotSpaceToken.fromStream(stream);

                if (!nextToken.procede(parser)) {
                    // skip parser
                    break;
                }
            }
            try {
                result.push(flushedParser(stream));
            } catch(e) {
                break;
            }

            if (!optionalSeperator(stream)) {
                break;
            }
        }

        if (!canListBeEmpty && result.length == 0) {
            throw new EmptyStreamError(`list of elements is expected`, stream);
        }

        return result;
    }, parser.probe);
}

export type NamedTokenParserResult = {
    [name: string] : ReturnType<TokenParser>
};

export function sequenceName(name: string,
                             ...parsers: TokenParser[]) : TokenParser<NamedTokenParserResult> {
    return function(stream : TokenStream) : NamedTokenParserResult {
        return {
            [name]: sequence(...parsers)(stream),
        };
    };
}

//type SequenceReturn<R extends TokenParser<any>[]> = FilterNotVoid<ReturnTypeMap<R>>;
type SequenceReturn<R extends TokenParser<any>[]> = ReturnTypeMap<R>;

export function sequence<R extends TokenParser[]>(...parsers: R) : TokenParser<SequenceReturn<R>> {
    return probe(function sequenceInst(stream: TokenStream) : SequenceReturn<R> {
        const parserStream = new LookAheadTokenStream(stream);
        const results = [];
        for (var i = 0; i < parsers.length; i++) {
            const parser = parsers[i];
            try {
                const result = parser(parserStream);
                results.push(result);
            } catch(e) {
                if (i > 0) {
                    throw SequenceError.reuse(e, i);
                } else {
                    throw e;
                }
            }
        }

        // TODO flush might be not needed if we call sequence inside firstOf/or
        parserStream.flush();
        return results as SequenceReturn<R>;
    }, parsers[0].probe);
}

export function sequenceVoid(...parsers: TokenParser[]) : TokenParser<void> {
    return probe(function(stream: TokenStream) : void {
        for (var i = 0; i < parsers.length; i++) {
            try {
                parsers[i](stream);
            } catch(e) {
                if (i > 0) {
                    throw SequenceError.reuse(e, i);
                } else {
                    throw e;
                }
            }
        }
    }, parsers[0].probe);
}

export function sequenceWithPosition(...parsers: TokenParser[]) : TokenParserArrayWithPosition {
    return probe(function(stream: TokenStream) : ParsedSourceWithPosition[] {
        const parserStream = new LookAheadTokenStream(stream);
        const result = [] as ParsedSourceWithPosition[];
        for (var i = 0; i < parsers.length; i++) {
            try {
                const pos = parserStream.currentPosition();
                const parsedResult = parsers[i](parserStream);
                if (isToken(parsedResult)) {
                    result.push({
                        value: parsedResult.value,
                        position: parsedResult.position,
                    });
                } else if (parsedResult === undefined) { // option() can return undefined for example
                    result.push({
                        value: undefined,
                        position: new Position(0, 0),
                    });
                } else {
                    const sourceFragment = new LeftTrimSourceFragment(parserStream.sourceFragment(pos));
                    result.push({
                        value: parsedResult,
                        position: sourceFragment.position,
                    });
                }
            } catch(e) {
                if (i > 0) {
                    throw SequenceError.reuse(e);
                } else {
                    throw e;
                }
            }
        }

        // TODO flush might be not needed if we call sequence inside firstOf/or
        parserStream.flush();
        return result;
    }, parsers[0].probe);
}

export function map<S, D>(parser : TokenParser<S>, mapFn: (item : S) => D) : TokenParser<D> {
    return probe(function(stream : TokenStream) : D {
        return mapFn(parser(stream));
    }, parser.probe);
}

export function mapJoinStrings(parser : TokenParser, delim = ' ') : TokenParser {
    return map(parser, (item) => item.join(delim));
}

export function mapJoinStringsNoSpace(parser : TokenParser) : TokenParser {
    return map(parser, (item) => item.join(''));
}

export function longestOf(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let errors = [];
        let result = [] as Array<[ReturnType<TokenParser>, FlushableTokenStream]>;
        for (let i = 0; i < parsers.length; i++) {
            try {
                let parserStream = new LookAheadTokenStream(stream);
                result.push([parsers[i](parserStream), parserStream]);
            } catch( e ) {
                errors.push(e);
            }
        }

        if (result.length == 0) {
            throw ParserError.reuse(`none of the parsers worked`, stream.peek());
        } else {
            const [longestResult, longestStream] = result.reduce((prevValue, curValue) => {
                if (curValue[1].currentPosition() > prevValue[1].currentPosition()) {
                    return curValue;
                } else {
                    return prevValue;
                }

            });

            longestStream.flush();
            return longestResult;
        }
    };
}

type FirstOfResult<R extends TokenParser[]> = OneOfArray<ReturnTypeMap<R>>;

export function firstOf<R extends TokenParser[]>(...parsers: R) : TokenParser<FirstOfResult<R>> {
    return function firstOfInst(stream: TokenStream) : FirstOfResult<R> {
        let sequenceErrors = [];
        let blockErrors = [];
        const nextToken = NextNotSpaceToken.fromStream(stream);
        for (var i = 0; i < parsers.length; i++) {
            const parser = parsers[i];
            if (!nextToken.procede(parser)) {
                // skip parser
                continue;
            }
            try {
                let parserStream = new LookAheadTokenStream(stream);
                const result = parser(parserStream);
                parserStream.flush();
                return result;
            } catch( e ) {
                if (e instanceof BlockParserError) {
                    blockErrors.push(e);
                } else if (e instanceof SequenceError){
                    sequenceErrors.push(e);
                } else if (e instanceof LexerError) {
                    throw e;
                }
            }
        }

        if (blockErrors.length > 0) {
            throw blockErrors[0];
        } else if (sequenceErrors.length > 0) { //TODO the array is not needed here
            throw sequenceErrors[0];
        } else {
            if (stream.eof()) {
                throw UnexpectedEndError.reuse(stream);
            } else {
                const token = stream.peek();
                throw ParserError.reuse(`unknown statement "${token.value}"`, token);
            }
        }
    };
}

type OptionalReturnType<R> = R | undefined;

// TODO and string to ReturnType when parser returns void
// TODO make optional with default value and proper typeing
export function optional<R>(parser: TokenParser<NeverVoid<R>>) : TokenParser<OptionalReturnType<R>> {
    return function optionalInst(stream: TokenStream) : OptionalReturnType<R> {
        if (parser.probe) {
            const nextToken = NextNotSpaceToken.fromStream(stream);

            if (!nextToken.procede(parser)) {
                return undefined;
            }
        }
        const parserStream = new LookAheadTokenStream(stream);

        try {
            let result = parser(parserStream);
            if (result === undefined) {
                throw new Error('parser returned undefined');
            }
            parserStream.flush();
            return result;
        } catch(e) {
            if (e instanceof BlockParserError) {
                throw e;
            }
            return undefined;
        }
    };
}

export function optionalBool<R>(parser: TokenParser<R>) : TokenParser<boolean> {
    return function optionalBoolInst(stream: TokenStream) : boolean {
        if (parser.probe) {
            const nextToken = NextNotSpaceToken.fromStream(stream);

            if (!nextToken.procede(parser)) {
                return false;
            }
        }
        const parserStream = new LookAheadTokenStream(stream);

        try {
            parser(parserStream);
            parserStream.flush();
            return true;
        } catch(e) {
            if (e instanceof BlockParserError) {
                throw e;
            }
            return false;
        }
    };
}

export function optionalRaw(parser: TokenParser<void>) : TokenParser<string | undefined> {
    return function optionalRawInst(stream: TokenStream) : undefined | string {
        if (parser.probe) {
            const nextToken = NextNotSpaceToken.fromStream(stream);

            if (!nextToken.procede(parser)) {
                return undefined;
            }
        }
        const parserStream = new LookAheadTokenStream(stream);

        try {
            parser(parserStream);
            const result = parserStream.sourceFragment().value;
            parserStream.flush();
            return result;
        } catch(e) {
            if (e instanceof BlockParserError) {
                throw e;
            }
            return undefined;
        }
    };
}

export function oneOfSymbols(...chars: MultiSymbol[]) : TokenParser<SymbolToken> {

    const sortedChars = chars.sort((a, b) => b.name.length - a.name.length);
    let groupByLength = [] as MultiSymbol[][];
    let charsForErrorReports = '';
    let len = 0;
    for(var i = 0; i < sortedChars.length; i++) {
        const item = sortedChars[i];

        if (len != item.name.length) {
            groupByLength.push([item])
        } else {
            groupByLength[groupByLength.length - 1].push(item);
        }
        len = item.name.length;

        // NOTE some wierd optimization due to a "wrong map" deop issue
        if (i > 0) {
            charsForErrorReports += ', ' + item.name;
        } else {
            charsForErrorReports += item.name;
        }
    }

    return function(stream: TokenStream) : SymbolToken {
        const firstToken = peekAndSkipSpaces(stream);

        if (firstToken.type != TokenType.Symbol) {
            throw ParserError.reuse(`one of ${charsForErrorReports} is expected`, firstToken);
        }

        for (var i = 0; i < groupByLength.length; i++) {
            const group = groupByLength[i];
            const len = group[0].name.length;
            let acc = firstToken.value;
            const groupStream = new LookAheadTokenStream(stream);
            for (let i = 1; i < Number(len); i++) {
                if (groupStream.eof()) {
                    break;
                }
                const token = peekNextToken(groupStream);
                if (token.type == TokenType.Symbol) {
                    acc += token.value;
                } else {
                    break;
                }
            }

            if (acc.length == len) {
                for (const item of group) {
                    if (item.name == acc) {
                        groupStream.flush();
                        return {
                            type: TokenType.Symbol,
                            position: firstToken.position,
                            value: acc
                        };
                    }
                }
            }
        }

        throw ParserError.reuse(`one of ${charsForErrorReports} is expected`, firstToken);
    };
}
oneOfSymbols.probe = isSymbolNextToken;

export function oneOfSimpleSymbols(chars: SyntaxSymbol[],
                                   peekNextToken = peekAndSkipSpaces) : TokenParser<SymbolToken> {

    let charsForErrorReports = '';
    for(var i = 0; i < chars.length; i++) {
        charsForErrorReports += chars[i].name;
    }

    return function(stream: TokenStream) : SymbolToken {
        const token = peekNextToken(stream);

        if (token.type == TokenType.Symbol) {
            for (var i = 0; i < chars.length; i++) {
                if (chars[i].name == token.value) {
                    return token;
                }
            }
        }

        throw ParserError.reuse(`one of ${charsForErrorReports} is expected`, token);
    };
}
oneOfSymbols.probe = isSymbolNextToken;

export function anyString(stream: TokenStream) : StringToken {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.String) {
        return token;
    }

    throw ParserError.reuse(`string literal is expected`, token);
}
anyString.probe = isStringNextToken;

export function anyTempateStringLiteral(stream: TokenStream) : TemplateStringToken {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.TemplateString) {
        return token;
    }

    throw ParserError.reuse(`template string literal is expected`, token);
}

export function anyLiteral(stream: TokenStream, peekNext = peekAndSkipSpaces) : LiteralToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Literal) {
        return token;
    }

    throw ParserError.reuse(`literal is expected`, token);
}

export function anySymbol(stream : TokenStream, peekNext = peekAndSkipSpaces) : SymbolToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Symbol) {
        return token;
    }
    throw ParserError.reuse(`symbol is expected`, token);
}

export function anySpace(stream : TokenStream, peekNext = peekNextToken) : SpaceToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Space) {
        return token;
    }
    throw ParserError.reuse(`space is expected`, token);
}

export function symbol(ch: SyntaxSymbol,
                       peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser<SymbolToken> {
    return function(stream: TokenStream) : SymbolToken {
        const token = peekFn(stream);

        if (ch.equal(token)) {
            return {
                type: TokenType.Symbol,
                position: token.position,
                value: ch.name,
            };
        }

        throw ParserError.reuse(`${ch.name} is expected`, token);
    };
}

export function multiSymbol(ch: MultiSymbol,
                       peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser<SymbolToken> {
    return probe(function(stream: TokenStream) : SymbolToken {
        const token = peekFn(stream);

        if (token.type == TokenType.Symbol && token.value == ch.name[0]) {
            for (let i = 1; i < ch.name.length; i++) {
                const nextToken = peekNextToken(stream);

                if (!(nextToken.type == TokenType.Symbol
                    && nextToken.value == ch.name[i])) {
                    throw ParserError.reuse(`${ch.name} is expected`, token);
                }
            }

            return {
                type: TokenType.Symbol,
                position: token.position,
                value: ch.name,
            };
        }

        throw ParserError.reuse(`${ch.name} is expected`, token);
    }, isSymbolNextToken);
}

export const semicolon = symbol(Symbols.semicolon);

export function anyBlock(stream: TokenStream) : LazyNode {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Block || token.type == TokenType.LazyBlock) {
        return {
            type: NodeType.Lazy,
            value: token.value,
        };
    }

    throw ParserError.reuse(`block is expected`, token);
}

export function leftHandRecurciveRule(leftRule : TokenParser,
                                      rightRule : TokenParser) : TokenParser<void> {
    const optionalRight = optionalBool(rightRule);
    return function leftHandRecurciveRuleInst(stream : TokenStream) : void {
        leftRule(stream);
        do {
            let right = optionalRight(stream);
            if (!right) {
                break;
            }
        } while(true);
    };
}

export function squareBracket(stream: TokenStream) : SquareBracketsToken {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.SquareBrackets) {
        return token;
    }

    throw ParserError.reuse(`squere brackets were expected`, token);
}

export function roundBracket(stream: TokenStream, peekNext = peekAndSkipSpaces) : LazyNode {
    const token = peekNext(stream);

    if (token.type == TokenType.RoundBrackets) {
        return {
            type: NodeType.Lazy,
            value: token.value,
        };
    }

    throw ParserError.reuse(`round brackets were expected`, token);
}
roundBracket.probe = isRoundBracketNextToken;

export function regexpLiteral(reg : RegExp, peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && reg.test(token.value)) {
            return token.value;
        } else {
            throw ParserError.reuse(`expected literal matched to regexp ${reg}`, token);
        }
    };
}

export function strictLoop<R>(parser : TokenParser<R>) : TokenParser<R[]> {
    return function strictLoopInst(stream : TokenStream) : R[] {
        let results = [];
        while(!stream.eof()) {
            const result = parser(stream);
            if (result != null && result !== undefined) {
                results.push(result);
            }
        }

        return results;
    };
}

export function repeat1<R>(parser : TokenParser<NeverVoid<R>>) : TokenParser<R[]> {
    const optionalParser = optional(parser);
    return function repeat1Inst(stream : TokenStream) : R[] {
        let results = [parser(stream)] as R[];
        while(!stream.eof()) {
            const result = optionalParser(stream);
            if (result === undefined) {
                break;
            } else {
                results.push(result);
            }
        }

        return results;
    };
}

export function repeat<R>(parser : TokenParser<NeverVoid<R>>) : TokenParser<R[]> {
    const optionalParser = optional(parser);
    return function repeatInst(stream : TokenStream) : R[] {
        let results = [];
        while(!stream.eof()) {
            const result = optionalParser(stream);
            if (result === undefined) {
                break;
            } else {
                results.push(result);
            }
        }

        return results;
    };
}

export function isLazyBlockParser<R>(obj : any) : obj is LazyBlockParser<R> {
    return obj.parse;
}
export class LazyBlockParser<R> {
    constructor(private readonly parser : TokenParser<R>,
                private readonly token : OneOfBlockToken) {
    }

    private getBlockType(token : OneOfBlockToken) : BlockType {
       switch(token.value[0]) {
            case '(':
            return BlockType.RoundBracket;
            case '[':
            return BlockType.SquareBracket;
            case '{':
            return BlockType.CurlyBracket;
            default:
            throw ParserError.reuse(`bracket type ${token.value[0]} is unsupported`, token);
        }
    }

    parse() : BlockNode<R> {
        const tokens = jssLexer(SubStringInputStream.fromBlockToken(this.token));
        const tokenStream = new ArrayTokenStream(tokens, this.token.position);
        let result;
        try {
            result = this.parser(tokenStream);
        } catch (e) {
            throw new BlockParserError(e);
        }
        if (!tokenStream.eof()) {
            throw ParserError.reuse(`unexpected token " ${tokenStream.peek().value} "`, tokenStream.peek());
        }
        return {
            type: NodeType.Block,
            blockType: this.getBlockType(this.token),
            items: result,
        };
    }
}

export function lazyBlock<R>(expectedTokenType : OneOfBlockTokenType,
                          parser : TokenParser<R>) : TokenParser<LazyBlockParser<R>> {
    return probe(function(stream : TokenStream) : LazyBlockParser<R> {
        const token = peekAndSkipSpaces(stream);
        if (token.type == expectedTokenType) {
            return new LazyBlockParser<R>(parser, token);
        }

        throw ParserError.reuse(`block is expected`, token);
    }, function(nextToken : NextToken) {
        return nextToken.token.type == expectedTokenType;
    });
}

export function isBlockNode<R>(obj : any) : obj is BlockNode<R> {
    return obj.type && obj.type == NodeType.Block
        && obj.blockType && obj.items;
}

//TODO block can by rewritten using lazyBlock
type OneOfBlockTokenType = ExtractType<OneOfBlockToken>;
export function block<R>(expectedTokenType : OneOfBlockTokenType,
                      parser : TokenParser<R>) : TokenParser<BlockNode<R>> {
    function getBlockType(token : Token) : BlockType {
       switch(token.value[0]) {
            case '(':
            return BlockType.RoundBracket;
            case '[':
            return BlockType.SquareBracket;
            case '{':
            return BlockType.CurlyBracket;
            default:
            throw ParserError.reuse(`bracket type ${token.value[0]} is unsupported`, token);
        }
    }
    return probe(function(stream : TokenStream) : BlockNode<R> {
        const token = peekAndSkipSpaces(stream);
        if (token.type == expectedTokenType) {
            const tokens = jssLexer(SubStringInputStream.fromBlockToken(token));
            const tokenStream = new ArrayTokenStream(tokens, token.position);
            const blockType = getBlockType(token);
            let result;
            try {
                result = parser(tokenStream);
            } catch (e) {
                throw new BlockParserError(e);
            }
            if (!tokenStream.eof()) {
                throw ParserError.reuse(`unexpected token " ${tokenStream.peek().value} "`, tokenStream.peek());
            }
            return {
                type: NodeType.Block,
                blockType: blockType,
                items: result,
            };
        }

        throw ParserError.reuse(`block is expected`, token);
    }, function(nextToken : NextToken) {
        return nextToken.token.type == expectedTokenType;
    });
}

function endOfHtmlComment(stream : TokenStream) : void {
    symbol(Symbols.minus, peekNextToken)(stream);
    symbol(Symbols.minus, peekNextToken)(stream);
    symbol(Symbols.lt, peekNextToken)(stream);
}

function htmlStyleComment(stream : TokenStream) : void {
    symbol(Symbols.gt, peekNextToken)(stream);
    symbol(Symbols.not, peekNextToken)(stream);
    symbol(Symbols.minus, peekNextToken)(stream);
    symbol(Symbols.minus, peekNextToken)(stream);

    while(!stream.eof()) {
        if (optionalRaw(endOfHtmlComment)(stream)) {
            break;
        }

        stream.next();
    }
}

export function ignoreSpacesAndComments(stream : TokenStream) : IgnoreNode {
    const result = [];
    var token;
    const optionalHtmlStyleComment = optionalRaw(htmlStyleComment);
    while(!stream.eof()) {
        token = stream.peek();
        if (isSpaceOrComment(token)) {
            stream.next();
            result.push(token.value);
        } else if (Symbols.gt.equal(token)) {
            const htmlComment = optionalHtmlStyleComment(stream);

            if (htmlComment) {
                result.push(htmlComment);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    if (token === undefined) {
        throw UnexpectedEndError.reuse(stream);
    }

    if (token && result.length == 0) {
        throw ParserError.reuse('Comment or space symbols are expected', token);
    }

    return {
        type: NodeType.Ignore,
        items: result
    };
}

export function andRule(...parsers : TokenParser[]) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        let result = null;
        for (const parser of parsers) {
            result = parser(stream);
        }

        return result;
    };
}

export function notAllowed(parserArray : TokenParser[] | TokenParser, errorMessage : string = 'cannot start with') : TokenParser {
    const parsers = Array.isArray(parserArray) ? parserArray : [parserArray];
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        for (const parser of parsers) {
            const stubStream = new LookAheadTokenStream(stream);
            try {
                parser(stubStream);
            } catch (e) {
                // it's ok
                continue;
            }
            throw ParserError.reuse(errorMessage, stream.peek());
        }
    };
}

export function isNext(parser: TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const parserStream = new LookAheadTokenStream(stream);

        try {
            parser(parserStream);
            return true;
        } catch(e) {
            if (e instanceof BlockParserError) {
                throw e;
            }
            return false;
        }
    };
}

export function repeatUntil(parser : TokenParser, until : TokenParser) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser>[] {
        let results = [] as ReturnType<TokenParser>[];
        while(!stream.eof()) {
            const isEnd = isNext(until)(stream);
            if (isEnd) {
                break;
            } else {
                try {
                    results.push(parser(stream));
                } catch(e) {
                    if (e instanceof UnexpectedEndError) {
                        break;
                    }

                    throw e;
                }
            }
        }

        return results;
    };
}

export function endsWithOptionalSemicolon<R>(parser : TokenParser<R>) : TokenParser<R> {
    return probe(function(stream : TokenStream) : R {
        const result = parser(stream);
        optionalBool(semicolon)(stream);

        return result;
    }, parser.probe);
}

export function skip(parser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : void {
        parser(stream);
    };
}

export function probe(parser : TokenParser, probeFn?: ProbeFn) : TokenParser {
    parser.probe = probeFn;
    return parser;
}
