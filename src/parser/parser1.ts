import { Keyword, Keywords, ReservedWords } from "keywords";
import { SyntaxSymbol, Symbols, AssigmentOperator } from "symbols";
import { Token, TokenType } from "token";
import { CommentNode, CssBlockNode, CssImportNode, JsImportNamespace, JsImportNode, NodeType, SyntaxTree, VarDeclaraionNode } from "./syntaxTree";

export interface TokenStream {
    take(idx: number): Token;
    takeNext(): Token;
    next(): Token;
    movePosition(newPos: number): void;
    eof(): boolean;
    currentPosition(): number;
};

interface ChildTokenStream extends TokenStream {
    flush() : void;
    rawValue() : string;
}

export class ArrayTokenStream implements TokenStream {
    private pos : number = 0;
    constructor(private tokens : Token[]) {
    }

    take(idx: number): Token {
        return this.tokens[idx];
    }

    next(): Token {
        return this.tokens[this.pos++];
    }

    takeNext() : Token {
        return this.tokens[this.pos + 1];
    }

    movePosition(newPos: number): void {
        this.pos = newPos;
    }

    currentPosition() : number {
        return this.pos;
    }

    eof(): boolean {
        return this.tokens.length <= this.pos;
    }
}


class CommonChildTokenStream implements ChildTokenStream {
    private pos : number;
    private startPos : number;
    constructor(private parent: TokenStream) {
        this.pos = parent.currentPosition();
        this.startPos = parent.currentPosition();
    }

    next() : Token {
        return this.take(this.pos++);
    }

    take(idx: number) : Token {
        return this.parent.take(idx);
    }

    takeNext() : Token {
        return this.parent.take(this.pos + 1);
    }

    movePosition(idx: number) {
        this.pos = idx;
    }

    eof() : boolean {
        return this.parent.eof();
    }

    rawValue() : string {
        let result = '';
        for (let i = this.startPos; i < this.pos; i++) {
            result += this.parent.take(i).value;
        }

        return result;
    }

    flush() {
        this.parent.movePosition(this.pos);
    }

    currentPosition() {
        return this.pos;
    }
}

type TokenParser = (stream: TokenStream) => any;

function literal(str: string) : TokenParser {
    return function(stream: TokenStream) : string {
        const token = peekAndSkipSpaces(stream);
        if (token.type == TokenType.Literal && token.value == str) {
            return token.value;
        }

        throw new Error(`expected ${str} but ${JSON.stringify(token)} was given}`);
    }
}

export function keyword(keyword: Keyword): TokenParser {
    return function(stream: TokenStream) : string {
        const token = peekAndSkipSpaces(stream);
        if (token.type == TokenType.Literal && keyword.equal(token)) {
            return token.value;
        } else {
            throw new Error(`keyword ${keyword.name} is expected, but ${JSON.stringify(token)} was given`);
        }
    };
}

function comma(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Comma) {
        return token.value;
    }

    throw new Error(`, is expected, but ${JSON.stringify(token)} was given`);
}

function functionExpression(stream: TokenStream) : void {
    keyword(Keywords._function)(stream);
    optional(anyJsIdentifier)(stream);
    roundBracket(stream);
    anyBlock(stream);
}

function superPropery(stream: TokenStream) : void {
    firstOf(
        // super [ Expression[+In, ?Yield, ?Await] ]
        sequence(keyword(Keywords._super), squareBracket),
        // super . IdentifierName
        sequence(keyword(Keywords._super), symbol(Symbols.dot), anyJsIdentifier),
    )(stream);
}

function metaPropery(stream: TokenStream) : void {
    firstOf(
        // NewTarget
        sequence(keyword(Keywords._new), symbol(Symbols.dot), keyword(Keywords._target)),
        // ImportMeta
        sequence(keyword(Keywords._import), symbol(Symbols.dot), keyword(Keywords._meta)),
    )(stream);
}

function memberExpression(stream: TokenStream) : void {
    firstOf(
        // PrimaryExpression[?Yield, ?Await]
        primaryExpression,
        // SuperProperty[?Yield, ?Await]
        superPropery,
        // MetaProperty
        metaPropery,
        // new MemberExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
        sequence(keyword(Keywords._new), memberExpression, roundBracket),
        // MemberExpression[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
        sequence(memberExpression, squareBracket),
        // MemberExpression[?Yield, ?Await] . IdentifierName
        sequence(memberExpression, symbol(Symbols.dot), anyJsIdentifier),
        // MemberExpression[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
        sequence(memberExpression, anyTempateStringLiteral),
    )(stream);
}

function newExpression(stream: TokenStream) : void {
    firstOf(
        // MemberExpression[?Yield, ?Await]
        memberExpression,
        // new NewExpression[?Yield, ?Await]
        sequence(keyword(Keywords._new), memberExpression),
    )(stream);
}

function callExpression(stream: TokenStream) : void {
    longestOf(
        // CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await]
        sequence(memberExpression, roundBracket),
        // SuperCall[?Yield, ?Await]
        sequence(keyword(Keywords._super), roundBracket),
        // ImportCall[?Yield, ?Await]
        sequence(keyword(Keywords._import), roundBracket),
        // CallExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
        sequence(callExpression, roundBracket),
        // CallExpression[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
        sequence(callExpression, squareBracket),
        // CallExpression[?Yield, ?Await] . IdentifierName
        sequence(callExpression, symbol(Symbols.dot), anyJsIdentifier),
        // CallExpression[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
        sequence(callExpression, anyTempateStringLiteral),
    )(stream);
}

function optionalChain(stream: TokenStream) : void {
    firstOf(
        //?. Arguments[?Yield, ?Await]
        sequence(symbol(Symbols.optionalChain), roundBracket),
        //?. [ Expression[+In, ?Yield, ?Await] ]
        sequence(symbol(Symbols.optionalChain), squareBracket),
        //?. IdentifierName
        sequence(symbol(Symbols.optionalChain), anyJsIdentifier),
        //?. TemplateLiteral[?Yield, ?Await, +Tagged]
        sequence(symbol(Symbols.optionalChain), anyTempateStringLiteral),
        //OptionalChain[?Yield, ?Await] Arguments[?Yield, ?Await]
        sequence(optionalChain, roundBracket),
        //OptionalChain[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
        sequence(optionalChain, squareBracket),
        //OptionalChain[?Yield, ?Await] . IdentifierName
        sequence(optionalChain, anyJsIdentifier),
        //OptionalChain[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
        sequence(optionalChain, anyTempateStringLiteral),

    )(stream);
}

function optionalExpression(stream: TokenStream) : void {
    firstOf(
        // MemberExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(memberExpression, optionalChain),
        // CallExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(callExpression, optionalChain),
        // OptionalExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(optionalExpression, optionalChain),
    )(stream);
}

function leftHandSideExpression(stream: TokenStream) : void {
    firstOf(
        // NewExpression[?Yield, ?Await]
        newExpression,
        //CallExpression[?Yield, ?Await]
        callExpression,
        //OptionalExpression
        optionalExpression,
    )(stream);
}

function classHeritage(stream: TokenStream) : void {
    keyword(Keywords._extends)(stream);
    leftHandSideExpression(stream);
}

function classExpression(stream: TokenStream) : void {
    keyword(Keywords._class)(stream);
    optional(anyJsIdentifier)(stream);
    optional(classHeritage)(stream);
    anyBlock(stream);
}

function regularExpressionLiteral(stream: TokenStream) : string {
    const body = regularExpressionBody(stream);
    if (!stream.eof()) {
        const nextToken = stream.takeNext();
        if (nextToken.type == TokenType.Literal) {
            stream.next();
            return body + nextToken.value;
        }
    }

    return body;
}

function primaryExpression(stream: TokenStream) : void {
    firstOf(
        // this
        // IdentifierReference[?Yield, ?Await]
        // Literal
        anyLiteral,
        // ArrayLiteral[?Yield, ?Await]
        squareBracket,
        // ObjectLiteral[?Yield, ?Await]
        anyBlock,
        // FunctionExpression
        functionExpression,
        // ClassExpression[?Yield, ?Await]
        classExpression,
        // GeneratorExpression
        sequence(keyword(Keywords._function), symbol(Symbols.astersik), anyJsIdentifier, roundBracket, anyBlock),
        // AsyncFunctionExpression
        sequence(keyword(Keywords._async), keyword(Keywords._function), anyJsIdentifier, roundBracket, anyBlock),
        // AsyncGeneratorExpression
        sequence(keyword(Keywords._async), keyword(Keywords._function), symbol(Symbols.dot), anyJsIdentifier, roundBracket, anyBlock),
        // RegularExpressionLiteral
        regularExpressionLiteral,
        // TemplateLiteral[?Yield, ?Await, ~Tagged]
        anyTempateStringLiteral,
        // CoverParenthesizedExpressionAndArrowParameterList
        roundBracket,
    )(stream);
}

function anyBlock(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Block || token.type == TokenType.LazyBlock) {
        return token.value;
    }

    throw new Error(`block is expected, but ${JSON.stringify(token)} was given`);
}

function regularExpressionBody(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.SlashBrackets) {
        return token.value;
    }

    throw new Error(`regular expression is expteced, but ${JSON.stringify(token)} was given`);
}

function anyLiteral(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.Literal) {
        return token.value;
    }

    throw new Error(`any literal is expteced, but ${JSON.stringify(token)} was given`);
}

export function symbol(ch: SyntaxSymbol) : TokenParser {
    return function(stream: TokenStream) : string {
        const token = peekAndSkipSpaces(stream);
        if (token.type == TokenType.Symbol && ch.equal(token)) {
            return token.value;
        }

        throw new Error(`${ch} is expected, but ${JSON.stringify(token)} was given`);
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

        throw new Error(`one of ${chars} is expected, but ${JSON.stringify(token)} was given`);
    };
}

function anyString(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.String) {
        return token.value;
    }

    throw new Error(`string literal is expected, byt ${JSON.stringify(token)} was given`);
}

function anyTempateStringLiteral(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);
    if (token.type == TokenType.TemplateString) {
        return token.value;
    }

    throw new Error(`template string literal is expected, byt ${JSON.stringify(token)} was given`);
}

//function or(...parsers: TokenParser[]) : TokenParser {
//    return function(stream: TokenStream) : any[] {
//        let errors = [];
//        let result = Array(parsers.length).fill(undefined);
//        for (let i = 0; i < parsers.length; i++) {
//            try {
//                let parserStream = new CommonChildTokenStream(stream);
//                result[i] = parsers[i](parserStream);
//                parserStream.flush();
//                return result;
//            } catch( e ) {
//                errors.push(e);
//            }
//        }
//
//        throw new Error(`none of the parsers worked ${errors}`)
//    };
//}

export function sequence(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const parserStream = new CommonChildTokenStream(stream);
        const result = [];
        for (const parser of parsers) {
            result.push(parser(parserStream));
        }

        parserStream.flush();
        return result;
    };
}

export function longestOf(...parsers: TokenParser[]) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let errors = [];
        let result = [] as Array<[ReturnType<TokenParser>, ChildTokenStream]>;
        for (let i = 0; i < parsers.length; i++) {
            try {
                let parserStream = new CommonChildTokenStream(stream);
                result.push([parsers[i](parserStream), parserStream]);
            } catch( e ) {
                errors.push(e);
            }
        }

        if (result.length == 0) {
            throw new Error(`none of the parsers worked`)
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
                let parserStream = new CommonChildTokenStream(stream);
                const result = parsers[i](parserStream);
                parserStream.flush();
                return result;
            } catch( e ) {
                errors.push(e);
            }
        }

        throw new Error(`none of the parsers worked`)
    };
}

export function optional(parser: TokenParser) : TokenParser {
    return function(stream: TokenStream) : any {
        const parserStream = new CommonChildTokenStream(stream);

        try {
            const result = parser(parserStream);
            parserStream.flush();
            return result;
        } catch(e) {
            return undefined;
        }
    };
}

// varName as varAlias
function importNamespace(stream: TokenStream) : JsImportNamespace {
    const varName = firstOf(anyLiteral, symbol(Symbols.astersik))(stream);
    const asKeyword = optional(keyword(Keywords._as))(stream);
    let varAlias = undefined;
    if (asKeyword) {
        varAlias = anyLiteral(stream);
    }

    return {
        varName,
        varAlias,
    }
}

export function commaList(parser: TokenParser) : TokenParser {
    return list(parser, comma);
}

function flushed(parser : TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        const childStream = new CommonChildTokenStream(stream);
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

function list(parser: TokenParser, separator: TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let result = [];
        do {
            try {
                result.push(flushed(parser)(stream));
            } catch(e) {
                break;
            }
        } while( optional(separator)(stream) );

        if (result.length == 0) {
            throw new Error(`list of elements is exptected`);
        }

        return result;
    };
}

export function parseJsImport(stream: TokenStream) : JsImportNode {
    keyword(Keywords._import)(stream);
    const importClause = commaList((stream) => {
        return firstOf(anyBlock, importNamespace)(stream);
    })(stream);

    keyword(Keywords._from)(stream);

    const moduleSpecifier = anyString(stream);

    return {
        type: NodeType.JsImport,
        vars: importClause,
        path: moduleSpecifier,
    } as JsImportNode;
}

function parseComment(stream: TokenStream) : CommentNode {
    const token = stream.next();

    switch (token.type) {
        case TokenType.Comment:
        case TokenType.MultilineComment:
            return {
                type: NodeType.Comment,
                value: token.value,
                rawValue: token.value,
            };
        default:
            throw new Error('comment is expected');
    }
}

function peekAndSkipSpaces(stream: TokenStream) : Token {
    while (!stream.eof()) {
        const token = stream.next();
        switch(token.type) {
            case TokenType.Space:
            case TokenType.Comment:
            case TokenType.MultilineComment:
                continue;
            default:
                return token;
        }
    }

    throw new Error(`end of the file`);
}

function squareBracket(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.SquareBrackets) {
        return token.value;
    }

    throw new Error('squere brackets were expected, but ${JSON.stringify(token) was given}');
}

function roundBracket(stream: TokenStream) : string {
    const token = peekAndSkipSpaces(stream);

    if (token.type == TokenType.RoundBrackets) {
        return token.value;
    }

    throw new Error('round brackets were expected, but ${JSON.stringify(token) was given}');
}

function parseCssSelector(stream: TokenStream) : string {
    const selector = optional(anyLiteral)(stream); //TODO it also maybe an *
    const attribure = optional(squareBracket)(stream);

    if (selector || attribure) {

        const combinator = optional(oneOfSymbols(
            Symbols.astersik,
            Symbols.lt,
            Symbols.tilde,
            Symbols.plus,
        ))(stream);

        const nextSelector = optional(parseCssSelector)(stream);

        return (selector ? selector : "")
            + (attribure ? attribure : "")
            + (combinator ? " " + combinator : "")
            + (nextSelector ? " " + nextSelector : "");
    }

    throw new Error(`invalid css selector, neither selector nor attribure is present`);
}

export function parseCssBlock(stream: TokenStream) : CssBlockNode {
    const selectors = commaList(parseCssSelector)(stream);
    const block = anyBlock(stream);

    return {
        type: NodeType.CssBlock,
        selectors,
        block,
    };
}

export function parseCssImport(stream: TokenStream) : CssImportNode {
    symbol(Symbols.at)(stream);
    literal('import')(stream);
    const path = anyString(stream);

    return {
        type: NodeType.CssImport,
        path,
    }
}

function anyJsIdentifier(stream: TokenStream) : string {
    const bindingIdentifier = anyLiteral(stream);
    if (bindingIdentifier in ReservedWords) {
        throw new Error(`${bindingIdentifier} is a reseved word`);
    }

    return bindingIdentifier;
}

function variableDeclaration(stream : TokenStream) : void {
    firstOf(
        // BindingIdentifier
        anyJsIdentifier,
        // BindingPatten
        squareBracket, //TODO we do not parse and do not validate the content yet
        anyBlock, //TODO we do not parse and do not validate the content yet
    )(stream);

    // Initializer
    const eq = optional(symbol(Symbols.eq))(stream);

    if (eq) {
       assignmentExpression(stream);
    }
}

function updateExpression(stream : TokenStream) : void {
    longestOf(
        // LeftHandSideExpression[?Yield, ?Await]
        leftHandSideExpression,
        // LeftHandSideExpression[?Yield, ?Await] [no LineTerminator here] ++
        sequence(leftHandSideExpression, symbol(Symbols.plus2)),
        // LeftHandSideExpression[?Yield, ?Await] [no LineTerminator here] --
        sequence(leftHandSideExpression, symbol(Symbols.minus2)),
        // ++ UnaryExpression[?Yield, ?Await]
        // -- UnaryExpression[?Yield, ?Await]
        sequence(oneOfSymbols(
            Symbols.plus2,
            Symbols.minus2,
        ), unaryExpression),
    )(stream);
}

function unaryExpression(stream : TokenStream) : void {
    firstOf(
        // UpdateExpression[?Yield, ?Await]
        updateExpression,
        // delete UnaryExpression[?Yield, ?Await]
        sequence(keyword(Keywords._delete), unaryExpression),
        // void UnaryExpression[?Yield, ?Await]
        sequence(keyword(Keywords._void), unaryExpression),
        // typeof UnaryExpression[?Yield, ?Await]
        sequence(keyword(Keywords._typeof), unaryExpression),
        // + UnaryExpression[?Yield, ?Await]
        // - UnaryExpression[?Yield, ?Await]
        // ~ UnaryExpression[?Yield, ?Await]
        // ! UnaryExpression[?Yield, ?Await]
        sequence(oneOfSymbols(
            Symbols.plus,
            Symbols.minus,
            Symbols.tilde,
            Symbols.not,
        ), unaryExpression),
        // [+Await]AwaitExpression[?Yield]
        sequence(keyword(Keywords._await), unaryExpression),
    )(stream);
}

function bitwiseOrExpression(stream : TokenStream) : void {
    longestOf(
        // BitwiseXORExpression[?In, ?Yield, ?Await]
        bitwiseXorExpression,
        // BitwiseORExpression[?In, ?Yield, ?Await] | BitwiseXORExpression[?In, ?Yield, ?Await]
        sequence(bitwiseOrExpression, symbol(Symbols.bitwiseOr), bitwiseXorExpression)
    )(stream);
}

function bitwiseXorExpression(stream : TokenStream) : void {
    longestOf(
        // BitwiseANDExpression[?In, ?Yield, ?Await]
        bitwiseAndExpression,
        // BitwiseXORExpression[?In, ?Yield, ?Await] ^ BitwiseANDExpression[?In, ?Yield, ?Await]
        sequence(bitwiseXorExpression, symbol(Symbols.bitwiseXor), bitwiseAndExpression)
    )(stream);
}

function bitwiseAndExpression(stream : TokenStream) : void {
    longestOf(
        // EqualityExpression[?In, ?Yield, ?Await]
        equalityExpression,
        // BitwiseANDExpression[?In, ?Yield, ?Await] & EqualityExpression[?In, ?Yield, ?Await]
        sequence(bitwiseAndExpression, symbol(Symbols.bitwiseAnd), equalityExpression)
    )(stream);
}

function equalityExpression(stream : TokenStream) : void {
    longestOf(
        // RelationalExpression[?In, ?Yield, ?Await]
        relationalExpression,
        // EqualityExpression[?In, ?Yield, ?Await] == RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] != RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] === RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] !== RelationalExpression[?In, ?Yield, ?Await]
        sequence(equalityExpression, oneOfSymbols(
            Symbols.eq2,
            Symbols.notEq2,
            Symbols.eq3,
            Symbols.notEq3
        ), relationalExpression)
    )(stream);
}

function relationalExpression(stream : TokenStream) : void {
    longestOf(
        // ShiftExpression[?Yield, ?Await]
        shiftExpression,
        // RelationalExpression[?In, ?Yield, ?Await] < ShiftExpression[?Yield, ?Await]
        // RelationalExpression[?In, ?Yield, ?Await] > ShiftExpression[?Yield, ?Await]
        // RelationalExpression[?In, ?Yield, ?Await] <= ShiftExpression[?Yield, ?Await]
        // RelationalExpression[?In, ?Yield, ?Await] >= ShiftExpression[?Yield, ?Await]
        sequence(relationalExpression, oneOfSymbols(
            Symbols.lt,
            Symbols.gt,
            Symbols.lteq,
            Symbols.gteq,
        ), shiftExpression),
        // RelationalExpression[?In, ?Yield, ?Await] instanceof ShiftExpression[?Yield, ?Await]
        sequence(relationalExpression, keyword(Keywords._instanceof), shiftExpression),
        // [+In] RelationalExpression[+In, ?Yield, ?Await] in ShiftExpression[?Yield, ?Await]
        sequence(relationalExpression, keyword(Keywords._in), shiftExpression),
    )(stream);
}

function shiftExpression(stream : TokenStream) : void {
    longestOf(
        // AdditiveExpression[?Yield, ?Await]
        additiveExpression,
        // ShiftExpression[?Yield, ?Await] << AdditiveExpression[?Yield, ?Await]
        // ShiftExpression[?Yield, ?Await] >> AdditiveExpression[?Yield, ?Await]
        // ShiftExpression[?Yield, ?Await] >>> AdditiveExpression[?Yield, ?Await]
        sequence(shiftExpression, oneOfSymbols(
            Symbols.shiftLeft,
            Symbols.shiftRight,
            Symbols.shiftRight3,
        ), additiveExpression)
    )(stream);
}

function additiveExpression(stream : TokenStream) : void {
    longestOf(
        // MultiplicativeExpression[?Yield, ?Await]
        multiplicativeExpression,
        // AdditiveExpression[?Yield, ?Await] + MultiplicativeExpression[?Yield, ?Await]
        // AdditiveExpression[?Yield, ?Await] - MultiplicativeExpression[?Yield, ?Await]
        sequence(additiveExpression, oneOfSymbols(
            Symbols.plus,
            Symbols.minus,
        ), multiplicativeExpression)
    )(stream);
}

function multiplicativeExpression(stream : TokenStream) : void {
    firstOf(
        // ExponentiationExpression[?Yield, ?Await]
        exponentiationExpression,
        // MultiplicativeExpression[?Yield, ?Await] MultiplicativeOperator ExponentiationExpression[?Yield, ?Await]
        // MultiplicativeOperator : one of
        // * / %
        sequence(multiplicativeExpression, oneOfSymbols(
            Symbols.astersik,
            Symbols.div,
            Symbols.percent,
        ), exponentiationExpression)
    )(stream);
}

function exponentiationExpression(stream : TokenStream) : void {
    longestOf(
        // UnaryExpression[?Yield, ?Await]
        unaryExpression,
        // UpdateExpression[?Yield, ?Await] ** ExponentiationExpression[?Yield, ?Await]
        sequence(updateExpression, symbol(Symbols.astersik2), exponentiationExpression),
    )(stream);
}



function logicalAndExpression(stream : TokenStream) : void {
    longestOf(
        // BitwiseORExpression[?In, ?Yield, ?Await]
        bitwiseOrExpression,
        // LogicalANDExpression[?In, ?Yield, ?Await] && BitwiseORExpression[?In, ?Yield, ?Await]
        sequence(logicalAndExpression, symbol(Symbols.and), bitwiseOrExpression),
    )(stream);
}


function logicalOrExpression(stream : TokenStream) : void {
    longestOf(
        // LogicalANDExpression[?In, ?Yield, ?Await]
        logicalAndExpression,
        // LogicalORExpression[?In, ?Yield, ?Await] || LogicalANDExpression[?In, ?Yield, ?Await]
        sequence(logicalOrExpression, symbol(Symbols.or), logicalAndExpression)
    )(stream);
}

function coalesceExpression(stream : TokenStream) : void {
    longestOf(
        // CoalesceExpressionHead[?In, ?Yield, ?Await] ?? BitwiseORExpression[?In, ?Yield, ?Await]
        sequence(coalesceExpressionHead, symbol(Symbols.coalesce), bitwiseOrExpression)
    )(stream);
}

function coalesceExpressionHead(stream : TokenStream) : void {
    longestOf(
        // CoalesceExpression[?In, ?Yield, ?Await]
        coalesceExpression,
        // BitwiseORExpression[?In, ?Yield, ?Await]
        bitwiseOrExpression
    )(stream);
}

function shortCircuitExpression(stream : TokenStream) : void {
    longestOf(
        // LogicalORExpression[?In, ?Yield, ?Await]
        logicalOrExpression,
        // CoalesceExpression[?In, ?Yield, ?Await]
        coalesceExpression,
    )(stream);
}

function conditionalExpression(stream : TokenStream) : void {
    longestOf(
        shortCircuitExpression,
        sequence(
            shortCircuitExpression,
            symbol(Symbols.question),
            assignmentExpression,
            symbol(Symbols.colon),
            assignmentExpression,
        )
    )(stream);
}

function yeildExpression(stream : TokenStream) : void {
    keyword(Keywords._yield)(stream);

    //TODO no line terminator here
    optional(symbol(Symbols.astersik))(stream);

    assignmentExpression(stream);
}

function bindingIdentifier(stream : TokenStream) : void {
    firstOf(
        //Identifier
        anyJsIdentifier,
        // yield
        keyword(Keywords._async),
        // await
        keyword(Keywords._yield)
    )(stream);
}

function arrowFunction(stream : TokenStream) : void {
    // ArrowParameters[?Yield, ?Await] [no LineTerminator here] => ConciseBody[?In]
    firstOf(bindingIdentifier, roundBracket)(stream);
    symbol(Symbols.arrow)(stream);
    firstOf(anyBlock, assignmentExpression)(stream);
}

function asyncArrowFunction(stream : TokenStream) : void {
    // async [no LineTerminator here] AsyncArrowBindingIdentifier[?Yield] [no LineTerminator here] => AsyncConciseBody[?In]
    keyword(Keywords._async)(stream);
    bindingIdentifier(stream);
    symbol(Symbols.arrow)(stream);
    firstOf(anyBlock, assignmentExpression)(stream);
}

function assignmentExpression(stream : TokenStream) : void {
    longestOf(
        // ConditionalExpression[?In, ?Yield, ?Await]
        conditionalExpression,
        // [+Yield]YieldExpression[?In, ?Await]
        yeildExpression,
        // ArrowFunction[?In, ?Yield, ?Await]
        arrowFunction,
        // AsyncArrowFunction[?In, ?Yield, ?Await]
        asyncArrowFunction,
        // LeftHandSideExpression[?Yield, ?Await] = AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] AssignmentOperator AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] &&= AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] ||= AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] ??= AssignmentExpression[?In, ?Yield, ?Await]
        sequence(
            leftHandSideExpression,
            oneOfSymbols(Symbols.eq, ...AssigmentOperator, Symbols.eq2and, Symbols.eq2or, Symbols.eq2questions),
            assignmentExpression,
        )
    )(stream);
}

export function parseJsVarStatement(stream: TokenStream) : VarDeclaraionNode {
    firstOf(keyword(Keywords._var), keyword(Keywords._const), keyword(Keywords._let))(stream);

    commaList(variableDeclaration)(stream);

    return {
        type: NodeType.VarDeclaration,
    }
}

const TOP_LEVEL_PARSERS = [
    parseComment,
    parseJsImport,

    parseCssBlock,
    parseCssImport,
];

export function parse(stream: TokenStream) : SyntaxTree {
    let tree = [] as SyntaxTree;
    while (!stream.eof()) {
        let node = null;
        let lastError = null;
        for (const parser of TOP_LEVEL_PARSERS) {
            const parserStream = new CommonChildTokenStream(stream);
            try {
                node = parser(parserStream);
                node.rawValue = parserStream.rawValue();
                parserStream.flush();
                break;
            } catch ( e ) {
                lastError = e;
            }
        }

        if (node == null) {
            throw lastError;
        } else {
            tree.push(node);
        }
    }

    return tree;
}
