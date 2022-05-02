import { Keyword } from "keywords";
import { StringInputStream } from "stream/input";
import { Symbols, SyntaxSymbol } from "symbols";
import { Token, TokenType } from "token";
import { lexer } from "./lexer";
import { ParserError } from "./parserError";
import { BlockNode, BlockType, LazyNode, NodeType } from "./syntaxTree";
import { TokenParser } from "./tokenParser";
import { ArrayTokenStream, GoAheadTokenStream, CommonGoAheadTokenStream, TokenStream } from "./tokenStream";
import { isSpaceOrComment, peekAndSkipSpaces, TokenStreamReader } from "./tokenStreamReader";

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

export function keyword(keyword: Keyword, peekFn : TokenStreamReader = peekAndSkipSpaces): TokenParser {
    return function(stream: TokenStream) : string {
        const token = peekFn(stream);
        if (token.type == TokenType.Literal && keyword.equal(token)) {
            return token.value;
        } else {
            throw new ParserError(`keyword "${keyword.name}" is expected`, token);
        }
    };
}

export function comma(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Comma) {
        return token.value;
    }

    throw new ParserError(`, is expected`, token);
}

export function commaList(parser: TokenParser) : TokenParser {
    return list(parser, comma);
}

export function flushed(parser : TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const childStream = new CommonGoAheadTokenStream(stream);
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

export function rawValue(parser : TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const childStream = new CommonGoAheadTokenStream(stream);
        let result;
        try {
            parser(childStream);
            result = childStream.rawValue();
            childStream.flush();
        } catch(e) {
            throw e;
        }

        return result;
    };
}

export function list(parser: TokenParser, separator: TokenParser, canListBeEmpty = false) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let result = [];
        do {
            try {
                result.push(flushed(parser)(stream));
            } catch(e) {
                break;
            }
        } while( optional(separator)(stream) );

        if (!canListBeEmpty && result.length == 0) {
            throw new ParserError(`list of elements is exptected`, stream.peek());
        }

        return result;
    };
}

export function sequence(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const parserStream = new CommonGoAheadTokenStream(stream);
        const result = [];
        for (const parser of parsers) {
            result.push(parser(parserStream));
        }

        // TODO flush might be not needed if we call sequence inside firstOf/or
        parserStream.flush();
        return result;
    };
}

export function longestOf(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let errors = [];
        let result = [] as Array<[ReturnType<TokenParser>, GoAheadTokenStream]>;
        for (let i = 0; i < parsers.length; i++) {
            try {
                let parserStream = new CommonGoAheadTokenStream(stream);
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
    return function(stream: TokenStream) : any[] {
        let errors = [];
        for (let i = 0; i < parsers.length; i++) {
            try {
                let parserStream = new CommonGoAheadTokenStream(stream);
                const result = parsers[i](parserStream);
                parserStream.flush();
                return result;
            } catch( e ) {
                errors.push(e);
            }
        }

        const token = stream.peek();
        throw new ParserError(`unknown statement "${token.value}"`, token);
    };
}

export function optional(parser: TokenParser) : TokenParser {
    return function(stream: TokenStream) : any {
        const parserStream = new CommonGoAheadTokenStream(stream);

        try {
            let result = parser(parserStream);
            if (result === undefined) {
                result = parserStream.rawValue();
            }
            parserStream.flush();
            return result;
        } catch(e) {
            return undefined;
        }
    };
}

interface SymbolArray {
    [idx: string] : true;
}
export function oneOfSymbols(...chars: SyntaxSymbol[]) : TokenParser {
    let symbols = {} as SymbolArray;
    chars.forEach((ch) => symbols[ch.name] = true);

    return function(stream: TokenStream) : string {
        const token = peekAndSkipSpaces(stream);
        if (token.type == TokenType.Symbol && token.value in symbols) {
            return token.value;
        }

        throw new ParserError(`one of ${chars} is expected`, token);
    };
}

export function anyString(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.String) {
        return token.value;
    }

    throw new ParserError(`string literal is expected`, token);
}

export function anyTempateStringLiteral(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.TemplateString) {
        return token.value;
    }

    throw new ParserError(`template string literal is expected`, token);
}

export function anyLiteral(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Literal) {
        return token.value;
    }

    throw new ParserError(`any literal is expteced`, token);
}

export function symbol(ch: SyntaxSymbol, peekFn : TokenStreamReader = peekAndSkipSpaces) : TokenParser {
    return function(stream: TokenStream) : string {
        const token = peekFn(stream);
        if (token.type == TokenType.Symbol && ch.equal(token)) {
            return token.value;
        }

        throw new ParserError(`${ch.name} is expected`, token);
    };
}

export const semicolon = symbol(Symbols.semicolon);

export function lazyBlock(stream: TokenStream) : LazyNode {
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

export function squareBracket(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.SquareBrackets) {
        return token.value;
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
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        let results = [] as ReturnType<TokenParser>[];
        while(!stream.eof()) {
            const result = parser(stream);
            results.push(result);
        }

        return results;

    };
}

export function loop(parser : TokenParser) : TokenParser {
    return function(stream : TokenStream) : ReturnType<TokenParser> {
        let results = [] as ReturnType<TokenParser>[];
        while(!stream.eof()) {
            const result = optional(parser)(stream);
            if (result === undefined) {
                break;
            }
            results.push(result);
        }

        return results;

    };
}

type OneOfBlockToken = TokenType.Block | TokenType.LazyBlock | TokenType.RoundBrackets | TokenType.SquareBrackets | TokenType.SlashBrackets;
export function block(expectedTokenType : OneOfBlockToken, parser : TokenParser) : TokenParser {
    function getBlockType(token : Token, stream : TokenStream) : BlockType {
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
            const tokens = lexer(new StringInputStream(token.value.slice(1, token.value.length - 1)));
            const tokenStream = new ArrayTokenStream(tokens);
            const blockType = getBlockType(token, stream);
            return {
                type: NodeType.Block,
                blockType: blockType,
                items: parser(tokenStream),
            } as BlockNode;
        }

        throw new ParserError(`block is expected`, token);
    };
}

export function spacesAndComments(stream : TokenStream) : ReturnType<TokenParser> {
    const result = [];
    while(!stream.eof()) {
        const token = stream.peek();
        if (isSpaceOrComment(token)) {
            result.push(stream.next().value);
        } else {
            break;
        }
    }

    return {
        type: NodeType.Ignore,
        value: result
    }
}
