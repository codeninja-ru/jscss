import { Keyword, Keywords, ReservedWords } from "keywords";
import { SyntaxSymbol, Symbols } from "symbols";
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

function keyword(keyword: Keyword): TokenParser {
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
    longestOf(
        // PrimaryExpression[?Yield, ?Await]
        primaryExpression,
        // MemberExpression[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
        sequence(memberExpression, squareBracket),
        // MemberExpression[?Yield, ?Await] . IdentifierName
        sequence(memberExpression, symbol(Symbols.dot), anyJsIdentifier),
        // MemberExpression[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
        sequence(memberExpression, anyTempateStringLiteral),
        // SuperProperty[?Yield, ?Await]
        superPropery,
        // MetaProperty
        metaPropery,
        // new MemberExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
        sequence(keyword(Keywords._new), memberExpression, roundBracket),
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
    longestOf(
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

function optionalCallExpression(stream: TokenStream) : void {
    longestOf(
        // MemberExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(memberExpression, optionalChain),
        // CallExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(callExpression, optionalChain),
        // OptionalExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        sequence(optionalCallExpression, optionalChain),
    )(stream);
}

function leftHandSideExpression(stream: TokenStream) : void {
    firstOf(
        // NewExpression[?Yield, ?Await]
        newExpression,
        //CallExpression[?Yield, ?Await]
        callExpression,
        //OptionalExpression
        optionalCallExpression,
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

function symbol(ch: SyntaxSymbol) : TokenParser {
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
function oneOfSymbols(...chars: SyntaxSymbol[]) : TokenParser {
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

function sequence(...parsers: TokenParser[]) : TokenParser {
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

function longestOf(...parsers: TokenParser[]) : TokenParser {
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
            throw new Error(`none of the parsers worked ${errors}`)
        } else {
            const [longestStream, longestResult] = result.reduce((prevValue, curValue) => {
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

function firstOf(...parsers: TokenParser[]) : TokenParser {
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

        throw new Error(`none of the parsers worked ${errors}`)
    };
}

function optional(parser: TokenParser) : TokenParser {
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

function commaList(parser: TokenParser) : TokenParser {
    return list(parser, comma);
}

function list(parser: TokenParser, separator: TokenParser) : TokenParser {
    return function(stream: TokenStream) : ReturnType<TokenParser> {
        let result = [];
        do {
            result.push(parser(stream));
        } while( optional(separator)(stream) )

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

function functionCall(stream: TokenStream) : string {
    const funcName = anyJsIdentifier(stream);
    roundBracket(stream);

    //TODO funcname can be an epression example: funcArray[i+1](params)(nextparams)

    return funcName;
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

function shortCircuitExpression(stream : TokenStream) : void {
    // TODO
    // LogicalORExpression[?In, ?Yield, ?Await]
    // CoalesceExpression[?In, ?Yield, ?Await]
    list(firstOf(
        roundBracket,
        anyJsIdentifier
    ), oneOfSymbols(
        Symbols.and,
        Symbols.or,
    ))(stream);
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

function assignmentExpression(stream : TokenStream) : void {
    longestOf(
        //TODO
        // ConditionalExpression[?In, ?Yield, ?Await]
        conditionalExpression,
        // [+Yield]YieldExpression[?In, ?Await]
        // ArrowFunction[?In, ?Yield, ?Await]
        // AsyncArrowFunction[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] = AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] AssignmentOperator AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] &&= AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] ||= AssignmentExpression[?In, ?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] ??= AssignmentExpression[?In, ?Yield, ?Await]
    )(stream);
}

export function parseJsVarStatement(stream: TokenStream) : VarDeclaraionNode {
    firstOf(keyword(Keywords._var), keyword(Keywords._const), keyword(Keywords._let))(stream);

    commaList(variableDeclaration)(stream);

    const eq = symbol(Symbols.eq)(stream);
    if (eq) {
        firstOf(
            anyLiteral,
            functionCall,
            anyString,
            squareBracket,
            anyBlock
        )(stream); //TODO expression
    }

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
