import { Keyword } from "keywords";
import { jssLexer } from "lexer/jssLexer";
import { SubStringInputStream } from "stream/input/SubStringInputStream";
import { Position } from "stream/position";
import { MultiSymbol, Symbols, SyntaxSymbol } from "symbols";
import { isToken, LiteralToken, SpaceToken, SquareBracketsToken, StringToken, SymbolToken, TemplateStringToken, Token, TokenType } from "token";
import { BlockParserError, EmptyStreamError, ParserError, SequenceError, UnexpectedEndError } from "./parserError";
import { isRoundBracketNextToken, isStringNextToken, isSymbolNextToken } from "./predicats";
import { LeftTrimSourceFragment, SourceFragment } from "./sourceFragment";
import { BlockNode, BlockType, IgnoreNode, LazyNode, NodeType } from "./syntaxTree";
import { NextNotSpaceToken, ParsedSourceWithPosition, ProbeFn, TokenParser, TokenParserArrayWithPosition } from "./tokenParser";
import { ArrayTokenStream, FlushableTokenStream, LookAheadTokenStream, TokenStream } from "./tokenStream";
import { isSpaceOrComment, peekAndSkipSpaces, peekNextToken, TokenStreamReader } from "./tokenStreamReader";


export function noLineTerminatorHere(stream : TokenStream) : void {
    while(!stream.eof()) {
        const token = stream.peek();
        if (token.type == TokenType.Space) {
            if (token.value.indexOf('\n') === -1) {
                stream.next();
                continue;
            } else {
                throw new ParserError('no line terminator here', token);
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
            throw new ParserError('no spaces here', token);
        } else {
            break;
        }
    }
}

export function keyword(keyword: Keyword,
                        peekFn : TokenStreamReader = peekAndSkipSpaces): TokenParser<LiteralToken> {
    return function(stream: TokenStream) : LiteralToken {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && keyword.equal(token)) {
            return token;
        } else {
            throw new ParserError(`keyword "${keyword.name}" is expected`, token);
        }
    };
}

export function literalKeyword(keyword: string,
                        peekFn : TokenStreamReader = peekAndSkipSpaces): TokenParser<LiteralToken> {
    return function(stream: TokenStream) : LiteralToken {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && token.value == keyword) {
            return token;
        } else {
            throw new ParserError(`keyword "${keyword}" is expected`, token);
        }
    };
}

export function comma(stream: TokenStream) : SymbolToken {
    const token = peekAndSkipSpaces(stream);
    if (Symbols.comma.equal(token)) {
        return token;
    }

    throw new ParserError(`, is expected`, token);
}
comma.probe = isSymbolNextToken;

export function commaList(parser: TokenParser, canListBeEmpty : boolean = false) : TokenParser {
    return list(parser, comma, canListBeEmpty);
}

export function flushed(parser : TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
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
    return function(stream: TokenStream) : SourceFragment {
        const childStream = new LookAheadTokenStream(stream);
        parser(childStream);
        const result = new LeftTrimSourceFragment(childStream.sourceFragment());
        childStream.flush();

        return result;
    };
}

export function returnRawValue(parser : TokenParser) : TokenParser<string> {
    return function(stream: TokenStream) : string {
        const childStream = new LookAheadTokenStream(stream);
        parser(childStream);
        const result = childStream.sourceFragment();
        childStream.flush();

        return result.value;
    };
}

export function list(parser: TokenParser,
                     separator: TokenParser,
                     canListBeEmpty : boolean = false) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let result = [];
        const optionalSeperator = optional(separator);
        const flushedParser = flushed(parser);
        while (!stream.eof()) {
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
    };
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

export function sequence(...parsers: TokenParser[]) : TokenParser<any[]> {
    return function(stream: TokenStream) : ReturnType<TokenParser>[] {
        const parserStream = new LookAheadTokenStream(stream);
        const result = [];
        for (var i = 0; i < parsers.length; i++) {
            try {
                result.push(parsers[i](parserStream));
            } catch(e) {
                if (i > 0) {
                    throw new SequenceError(e, i);
                } else {
                    throw e;
                }
            }
        }

        // TODO flush might be not needed if we call sequence inside firstOf/or
        parserStream.flush();
        return result;
    };
}

export function sequenceWithPosition(...parsers: TokenParser[]) : TokenParserArrayWithPosition {
    return function(stream: TokenStream) : ParsedSourceWithPosition[] {
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
                    throw new SequenceError(e);
                } else {
                    throw e;
                }
            }
        }

        // TODO flush might be not needed if we call sequence inside firstOf/or
        parserStream.flush();
        return result;
    };
}

type TokenParserMapFn = (item : ReturnType<TokenParser>) => ReturnType<TokenParser>;
export function map(parser : TokenParser, mapFn: TokenParserMapFn) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        return mapFn(parser(stream));
    };
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
            throw new ParserError(`none of the parsers worked`, stream.peek());
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

export function firstOf(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let sequenceErrors = [];
        let blockErrors = [];
        const nextToken = NextNotSpaceToken.fromStream(stream);
        for (var i = 0; i < parsers.length; i++) {
            const parser = parsers[i];
            try {
                if (parser.probe) {
                    if (nextToken.exists && !parser.probe(nextToken)) {
                        // skip parser
                        continue;
                    }
                }
                let parserStream = new LookAheadTokenStream(stream);
                const result = parser(parserStream);
                parserStream.flush();
                return result;
            } catch( e ) {
                if (e instanceof BlockParserError) {
                    blockErrors.push(e);
                } else if (e instanceof SequenceError){
                    sequenceErrors.push(e);
                }
            }
        }

        if (blockErrors.length > 0) {
            throw blockErrors[0];
        } else if (sequenceErrors.length > 0) { //TODO the array is not needed here
            throw sequenceErrors[0];
        } else {
            if (stream.eof()) {
                throw new UnexpectedEndError(stream);
            } else {
                const token = stream.peek();
                throw new ParserError(`unknown statement "${token.value}"`, token);
            }
        }
    };
}

export function optional(parser: TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        if (parser.probe) {
            const nextToken = NextNotSpaceToken.fromStream(stream);

            if (nextToken.exists && !parser.probe(nextToken)) {
                return undefined;
            }

        }
        const parserStream = new LookAheadTokenStream(stream);

        try {
            let result = parser(parserStream);
            if (result === undefined) {
                result = parserStream.sourceFragment().value;
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
            throw new ParserError(`one of ${charsForErrorReports} is expected`, firstToken);
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

        throw new ParserError(`one of ${charsForErrorReports} is expected`, firstToken);
    };
}
oneOfSymbols.probe = isSymbolNextToken;

export function oneOfSimpleSymbols(chars: SyntaxSymbol[], peekNextToken = peekAndSkipSpaces) : TokenParser<SymbolToken> {

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

        throw new ParserError(`one of ${charsForErrorReports} is expected`, token);
    };
}
oneOfSymbols.probe = isSymbolNextToken;

export function anyString(stream: TokenStream) : StringToken {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.String) {
        return token;
    }

    throw new ParserError(`string literal is expected`, token);
}
anyString.probe = isStringNextToken;

export function anyTempateStringLiteral(stream: TokenStream) : TemplateStringToken {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.TemplateString) {
        return token;
    }

    throw new ParserError(`template string literal is expected`, token);
}

export function anyLiteral(stream: TokenStream, peekNext = peekAndSkipSpaces) : LiteralToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Literal) {
        return token;
    }

    throw new ParserError(`literal is expected`, token);
}

export function anySymbol(stream : TokenStream, peekNext = peekAndSkipSpaces) : SymbolToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Symbol) {
        return token;
    }
    throw new ParserError(`symbol is expected`, token);
}

export function anySpace(stream : TokenStream, peekNext = peekNextToken) : SpaceToken {
    const token = peekNext(stream);
    if (token.type == TokenType.Space) {
        return token;
    }
    throw new ParserError(`space is expected`, token);
}

export function dollarSign(stream: TokenStream) : LiteralToken {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.Literal && token.value == '$') {
        return token;
    }

    throw new ParserError(`dollar ($) sign is expected here`, token);
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

        throw new ParserError(`${ch.name} is expected`, token);
    };
}

export function multiSymbol(ch: MultiSymbol,
                       peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser<SymbolToken> {
    return function(stream: TokenStream) : SymbolToken {
        const token = peekFn(stream);

        if (token.type == TokenType.Symbol && token.value == ch.name[0]) {
            for (let i = 1; i < ch.name.length; i++) {
                const nextToken = peekNextToken(stream);

                if (!(nextToken.type == TokenType.Symbol
                    && nextToken.value == ch.name[i])) {
                    throw new ParserError(`${ch.name} is expected`, token);
                }
            }

            return {
                type: TokenType.Symbol,
                position: token.position,
                value: ch.name,
            };
        }

        throw new ParserError(`${ch.name} is expected`, token);
    };
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

    throw new ParserError(`block is expected`, token);
}

export function leftHandRecurciveRule(leftRule : TokenParser, rightRule : TokenParser) : TokenParser {
    const optionalRight = optional(rightRule);
    return flushed(function(stream : TokenStream) : ReturnType<TokenParser> {
        let result = leftRule(stream);
        do {
            let right = optionalRight(stream);
            if (right) {
                result += right;
            } else {
                break;
            }
        } while(true);
        return result;
    });
}

export function squareBracket(stream: TokenStream) : SquareBracketsToken {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.SquareBrackets) {
        return token;
    }

    throw new ParserError(`squere brackets were expected`, token);
}

export function roundBracket(stream: TokenStream) : LazyNode {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.RoundBrackets) {
        return {
            type: NodeType.Lazy,
            value: token.value,
        };
    }

    throw new ParserError(`round brackets were expected`, token);
}
roundBracket.probe = isRoundBracketNextToken;

export function regexpLiteral(reg : RegExp, peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && reg.test(token.value)) {
            return token.value;
        } else {
            throw new ParserError(`expected literal matched to regexp ${reg}`, token);
        }
    };
}

export function strictLoop(parser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser>[] {
        let results = [] as ReturnType<TokenParser>[];
        while(!stream.eof()) {
            const result = parser(stream);
            if (result != null && result !== undefined) {
                results.push(result);
            }
        }

        return results;

    };
}

export function loop(parser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser>[] {
        let results = [] as ReturnType<TokenParser>[];
        const optionalParser = optional(parser);
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

export interface LazyBlockParser<R> {
    parse() : R;
}

export function lazyBlock(expectedTokenType : OneOfBlockTokenType, parser : TokenParser) : TokenParser {
    function getBlockType(token : Token) : BlockType {
       switch(token.value[0]) {
            case '(':
            return BlockType.RoundBracket;
            case '[':
            return BlockType.SquareBracket;
            case '{':
            return BlockType.CurlyBracket;
            default:
            throw new ParserError(`bracket type ${token.value[0]} is unsupported`, token);
        }
    }
    return function(stream : TokenStream) : LazyBlockParser<ReturnType<TokenParser>> {
        const token = peekAndSkipSpaces(stream);
        if (token.type == expectedTokenType) {
            return new class implements LazyBlockParser<ReturnType<TokenParser>> {
                parse() : ReturnType<TokenParser> {
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
                        throw new ParserError(`unexpected token " ${tokenStream.peek().value} "`, tokenStream.peek());
                    }
                    return {
                        type: NodeType.Block,
                        blockType: blockType,
                        items: result,
                    } as BlockNode;
                }
            };
        }

        throw new ParserError(`block is expected`, token);
    };
}

export function isBlockNode(obj : any) : obj is BlockNode {
    return obj.type && obj.type == NodeType.Block
        && obj.blockType && obj.items;
}

//TODO block can by rewritten using lazyBlock
type OneOfBlockTokenType = TokenType.Block | TokenType.LazyBlock | TokenType.RoundBrackets | TokenType.SquareBrackets ;
export function block(expectedTokenType : OneOfBlockTokenType, parser : TokenParser) : TokenParser {
    function getBlockType(token : Token) : BlockType {
       switch(token.value[0]) {
            case '(':
            return BlockType.RoundBracket;
            case '[':
            return BlockType.SquareBracket;
            case '{':
            return BlockType.CurlyBracket;
            default:
            throw new ParserError(`bracket type ${token.value[0]} is unsupported`, token);
        }
    }
    return function(stream : TokenStream) : ReturnType<TokenParser> {
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
                throw new ParserError(`unexpected token " ${tokenStream.peek().value} "`, tokenStream.peek());
            }
            return {
                type: NodeType.Block,
                blockType: blockType,
                items: result,
            } as BlockNode;
        }

        throw new ParserError(`block is expected`, token);
    };
}

export function ignoreSpacesAndComments(stream : TokenStream) : IgnoreNode {
    const result = [];
    var token;
    while(!stream.eof()) {
        token = stream.peek();
        if (isSpaceOrComment(token)) {
            result.push(stream.next().value);
        } else {
            break;
        }
    }

    if (token === undefined) {
        throw new UnexpectedEndError(stream);
    }

    if (token && result.length == 0) {
        throw new ParserError('Comment or space symbols are expected', token);
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
            throw new ParserError(errorMessage, stream.peek());
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

export function skip(parser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : void {
        parser(stream);
    };
}

export function probe(parser : TokenParser, probeFn?: ProbeFn) : TokenParser {
    parser.probe = probeFn;
    return parser;
}
