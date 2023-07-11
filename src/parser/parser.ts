import { Keywords, ReservedWords } from "keywords";
import { AssignmentOperator, Symbols } from "symbols";
import { LiteralToken, TokenType } from "token";
import { ExportFromClause, ExportSpecifier, FromClause, NamedExports } from "./exportsNodes";
import { ParserError, UnexpectedEndError } from "./parserError";
import { anyBlock, anyLiteral, anyString, anyTempateStringLiteral, block, comma, commaList, firstOf, ignoreSpacesAndComments, keyword, lazyBlock, leftHandRecurciveRule, longestOf, map, multiSymbol, noLineTerminatorHere, notAllowed, oneOfSymbols, optional, optionalRaw, rawValue, regexpLiteral, repeat, returnRawValue, returnValueWithPosition, roundBracket, sequence, squareBracket, strictLoop, symbol, ValueWithPosition } from "./parserUtils";
import { isLiteralNextToken, literalToString, makeIsKeywordNextTokenProbe, makeIsSymbolNextTokenProbe } from "./predicats";
import { AsyncFunctionEpressionNode, AsyncGeneratorEpressionNode, BlockType, ClassDeclarationNode, FunctionEpressionNode, GeneratorEpressionNode, IfNode, ImportSepcifier, JsImportNode, JsModuleNode, JsRawNode, JssScriptNode, MultiNode, Node, NodeType, VarDeclaraionNode, VarStatementNode } from "./syntaxTree";
import { NextToken } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { peekAndSkipSpaces, peekNextToken, peekNoLineTerminatorHere } from "./tokenStreamReader";
import { NeverVoid } from "./types";

//TODO turn into a decorator
function returnRawNode(stream : TokenStream) : JsRawNode {
    const source = rawValue(stream);
    return {
        type: NodeType.Raw,
        value: source.value,
        position: source.position,
    };
}

export function functionExpression(stream: TokenStream) : FunctionEpressionNode {
    keyword(Keywords._function)(stream);
    const name = optional(identifier)(stream);
    roundBracket(stream);
    anyBlock(stream);

    return {
        type: NodeType.FunctionExpression,
        name,
    };
}
functionExpression.probe = makeIsKeywordNextTokenProbe(Keywords._function);

function superPropery(stream: TokenStream) : void {
    firstOf(
        // super [ Expression[+In, ?Yield, ?Await] ]
        sequence(keyword(Keywords._super), squareBracket),
        // super . IdentifierName
        sequence(keyword(Keywords._super), symbol(Symbols.dot), identifier),
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
    return leftHandRecurciveRule(
        firstOf(
            // PrimaryExpression[?Yield, ?Await]
            primaryExpression,
            // SuperProperty[?Yield, ?Await]
            superPropery,
            // MetaProperty
            metaPropery,
            // new MemberExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
            sequence(keyword(Keywords._new), memberExpression, roundBracket),
        ),
        firstOf(
            // MemberExpression[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
            squareBracket,
            // MemberExpression[?Yield, ?Await] . IdentifierName
            sequence(symbol(Symbols.dot), identifier),
            // MemberExpression[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
            anyTempateStringLiteral,
        )
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
    leftHandRecurciveRule(
        firstOf(
            // CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await]
            sequence(memberExpression, roundBracket),
            // SuperCall[?Yield, ?Await]
            sequence(keyword(Keywords._super), roundBracket),
            // ImportCall[?Yield, ?Await]
            sequence(keyword(Keywords._import), roundBracket),
        ),
        firstOf(
            // CallExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
            roundBracket,
            // CallExpression[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
            squareBracket,
            // CallExpression[?Yield, ?Await] . IdentifierName
            sequence(symbol(Symbols.dot), identifier),
            // CallExpression[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
            anyTempateStringLiteral,
        )
    )(stream);
}

function optionalChain(stream: TokenStream) : void {
    leftHandRecurciveRule(
        sequence(
            multiSymbol(Symbols.optionalChain),
            //?. Arguments[?Yield, ?Await]
            //?. [ Expression[+In, ?Yield, ?Await] ]
            //?. IdentifierName
            //?. TemplateLiteral[?Yield, ?Await, +Tagged]
            firstOf(
                roundBracket,
                squareBracket,
                identifier,
                anyTempateStringLiteral
            )
        ),
        firstOf(
            //OptionalChain[?Yield, ?Await] Arguments[?Yield, ?Await]
            roundBracket,
            //OptionalChain[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
            squareBracket,
            //OptionalChain[?Yield, ?Await] . IdentifierName
            identifier,
            //OptionalChain[?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
            anyTempateStringLiteral,
        )

    )(stream);
}

function optionalExpression(stream: TokenStream) : void {
    leftHandRecurciveRule(
        firstOf(
            // MemberExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
            sequence(memberExpression, optionalChain),
            // CallExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
            sequence(callExpression, optionalChain),
        ),
        // OptionalExpression[?Yield, ?Await] OptionalChain[?Yield, ?Await]
        optionalChain,
    )(stream);
}

function leftHandSideExpression(stream: TokenStream) : void {
    firstOf( //NOTE I changed the order of operation since newExpression and callExpression can start with MemeberEpxression, but callExprssion has a recursion so it's large. changeing the order we don't need to use largeOf
        //CallExpression[?Yield, ?Await]
        callExpression,
        // NewExpression[?Yield, ?Await]
        newExpression,
        //OptionalExpression
        optionalExpression,
    )(stream);
}

function classHeritage(stream: TokenStream) : void {
    keyword(Keywords._extends)(stream);
    leftHandSideExpression(stream);
}

function classDeclaration(stream : TokenStream) : ClassDeclarationNode {
    keyword(Keywords._class)(stream);
    const name = optional(bindingIdentifier)(stream);
    classTail(stream);

    return {
        type: NodeType.ClassDeclaration,
        name,
    };
}
classDeclaration.probe = makeIsKeywordNextTokenProbe(Keywords._class);

const classExpression = classDeclaration;

function classTail(stream : TokenStream) : void {
    // ClassHeritage[?Yield, ?Await]opt { ClassBody[?Yield, ?Await]opt }
    optionalRaw(classHeritage)(stream);
    anyBlock(stream);
}

function nonDecimalIntergerLiteral(stream : TokenStream) : void {
    return firstOf(
        // BinaryIntegerLiteral[?Sep]
        regexpLiteral(/^0[bB][0-1\_]+n?$/),
        // OctalIntegerLiteral[?Sep]
        regexpLiteral(/^0[oO][0-7\_]+n?$/),
        // HexIntegerLiteral[?Sep]
        regexpLiteral(/^0[xX][0-9a-fA-F\_]+n?$/),
    )(stream);
}

function regularExpressionLiteral(stream: TokenStream) : string {
    const body = regularExpressionBody(stream);
    if (!stream.eof()) {
        const nextToken = stream.peek();
        if (nextToken.type == TokenType.Literal) {
            stream.next();
            return body + nextToken.value;
        }
    }

    return body;
}

export function numericLiteral(stream : TokenStream) : void {
    const numberRule = function(stream : TokenStream) {
        const numberPart = optionalRaw(regexpLiteral(/^[0-9\_]+([eE][\-\+][0-9\_]+)?n?$/))(stream);
        // NOTE: exponentioal part is odd here
        let fraction = undefined;
        let dot;
        if (numberPart === undefined) {
            dot = symbol(Symbols.dot, peekAndSkipSpaces)(stream);
        } else {
            dot = optional(symbol(Symbols.dot, peekNextToken))(stream);
        }
        if (dot) {
            fraction = optionalRaw(regexpLiteral(/^[0-9\_]+([eE][\-\+][0-9\_]+)?n?$/, peekNextToken))(stream);
        }

        if (numberPart === undefined && fraction === undefined) {
            throw ParserError.reuse("it's not a number", stream.peek());
        }

        return [numberPart, dot, fraction].filter(value => value !== undefined).join('');
    }

    firstOf(
        // DecimalLiteral
        // DecimalBigIntegerLiteral
        numberRule,

        // NonDecimalIntegerLiteral[+Sep]
        // NonDecimalIntegerLiteral[+Sep] BigIntLiteralSuffix
        nonDecimalIntergerLiteral,
    )(stream);
}
numericLiteral.probe = (nextToken : NextToken) => isLiteralNextToken(nextToken) || Symbols.dot.equal(nextToken.token);

function literal(stream : TokenStream) : void {
    firstOf(
        // NullLiteral
        keyword(Keywords._null),
        // BooleanLiteral
        firstOf(keyword(Keywords._true), keyword(Keywords._false)),
        // NumericLiteral
        numericLiteral,
        // StringLiteral
        anyString,
    )(stream);
}

function generatorExpression(stream : TokenStream) : GeneratorEpressionNode {
    const [,,name] = sequence(keyword(Keywords._function), symbol(Symbols.astersik), optional(identifier), roundBracket, anyBlock)(stream);

    return {
        type: NodeType.GeneratorExpression,
        name,
    };
}

function asyncFunctionExpression(stream : TokenStream) : AsyncFunctionEpressionNode {
    const [,,name] = sequence(keyword(Keywords._async), keyword(Keywords._function), optional(identifier), roundBracket, anyBlock)(stream);
    return {
        type: NodeType.AsyncFunctionExpression,
        name,
    };
}

function asyncGeneratorExpression(stream : TokenStream) : AsyncGeneratorEpressionNode {
    const [,,,name] = sequence(keyword(Keywords._async), keyword(Keywords._function), symbol(Symbols.dot), optional(identifier), roundBracket, anyBlock)(stream);
    return {
        type: NodeType.AsyncGeneratorExpression,
        name,
    };
}

function primaryExpression(stream: TokenStream) : void {
    firstOf(
        // this
        keyword(Keywords._this),
        // IdentifierReference[?Yield, ?Await]
        bindingIdentifier,
        // Literal
        literal,
        // ArrayLiteral[?Yield, ?Await]
        squareBracket,
        // ObjectLiteral[?Yield, ?Await]
        anyBlock,
        // FunctionExpression
        functionExpression,
        // ClassExpression[?Yield, ?Await]
        classExpression,
        // GeneratorExpression
        generatorExpression,
        // AsyncFunctionExpression
        asyncFunctionExpression,
        // AsyncGeneratorExpression
        asyncGeneratorExpression,
        // RegularExpressionLiteral
        regularExpressionLiteral,
        // TemplateLiteral[?Yield, ?Await, ~Tagged]
        anyTempateStringLiteral,
        // CoverParenthesizedExpressionAndArrowParameterList
        roundBracket,
    )(stream);
}

function regularExpressionBody(stream: TokenStream) : string {
    symbol(Symbols.div)(stream);

    let result = '/';
    let isEscapeMode = false;

    while(!stream.eof()) {
        const token = stream.next();

        if (token.type == TokenType.Symbol) {
            result += token.value;
            if (Symbols.div.equal(token) && !isEscapeMode) {
                return result;
            } else if (Symbols.backslash.equal(token)) {
                isEscapeMode = !isEscapeMode;
            } else {
                isEscapeMode = false;
            }
        } else if (token.type == TokenType.Space && token.value.indexOf('\n') !== -1) {
            throw ParserError.reuse(`unexpected end of the regexp`, token);
        } else {
            result += token.value;
            isEscapeMode = false;
        }
    }

    throw UnexpectedEndError.reuse(stream, `the regexp has been ended unexpectedly`);
}

function identifierName(stream : TokenStream) : LiteralToken {
    // NOTE it's a simplification of cause
    // it matches font-family as a literal for example
    return anyLiteral(stream);
}

export function identifier(stream: TokenStream) : string {
    const bindingIdentifier = identifierName(stream);
    if (bindingIdentifier.value in ReservedWords) {
        throw ParserError.reuse(`${bindingIdentifier} is a reseved word`, bindingIdentifier);
    }

    return bindingIdentifier.value;
}

function bindingIdentifier(stream : TokenStream) : string {
    return firstOf(
        // Identifier
        identifier,
        // yield
        map(keyword(Keywords._yield), literalToString),
        // await
        map(keyword(Keywords._await), literalToString),
    )(stream);
}

function variableDeclaration(stream : TokenStream) : VarDeclaraionNode {
    const name = firstOf(
        // BindingIdentifier
        bindingIdentifier,
        // BindingPatten
        squareBracket, //TODO we do not parse and do not validate the content yet
        anyBlock, //TODO we do not parse and do not validate the content yet
    )(stream);

    // Initializer
    const eq = optional(symbol(Symbols.eq))(stream);

    if (eq) {
       assignmentExpression(stream);
    }

    return {
        type: NodeType.VarDeclaration,
        name,
    }
}

export function updateExpression(stream : TokenStream) : void {
    firstOf(
        // LeftHandSideExpression[?Yield, ?Await]
        // LeftHandSideExpression[?Yield, ?Await] [no LineTerminator here] ++
        // LeftHandSideExpression[?Yield, ?Await] [no LineTerminator here] --
        sequence(leftHandSideExpression, optional(
            sequence(noLineTerminatorHere, oneOfSymbols(Symbols.plus2, Symbols.minus2))
        )),
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
    leftHandRecurciveRule(
        // BitwiseXORExpression[?In, ?Yield, ?Await]
        bitwiseXorExpression,
        // BitwiseORExpression[?In, ?Yield, ?Await] | BitwiseXORExpression[?In, ?Yield, ?Await]
        sequence(symbol(Symbols.bitwiseOr), bitwiseXorExpression)
    )(stream);
}

function bitwiseXorExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // BitwiseANDExpression[?In, ?Yield, ?Await]
        bitwiseAndExpression,
        // BitwiseXORExpression[?In, ?Yield, ?Await] ^ BitwiseANDExpression[?In, ?Yield, ?Await]
        sequence(symbol(Symbols.bitwiseXor), bitwiseAndExpression)
    )(stream);
}

function bitwiseAndExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // EqualityExpression[?In, ?Yield, ?Await]
        equalityExpression,
        // BitwiseANDExpression[?In, ?Yield, ?Await] & EqualityExpression[?In, ?Yield, ?Await]
        sequence(symbol(Symbols.bitwiseAnd), equalityExpression)
    )(stream);
}

function equalityExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // RelationalExpression[?In, ?Yield, ?Await]
        relationalExpression,
        // EqualityExpression[?In, ?Yield, ?Await] == RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] != RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] === RelationalExpression[?In, ?Yield, ?Await]
        // EqualityExpression[?In, ?Yield, ?Await] !== RelationalExpression[?In, ?Yield, ?Await]
        sequence(oneOfSymbols(
            Symbols.eq2,
            Symbols.notEq2,
            Symbols.eq3,
            Symbols.notEq3
        ), relationalExpression)
    )(stream);
}

function relationalExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // ShiftExpression[?Yield, ?Await]
        shiftExpression,
        firstOf(
            // RelationalExpression[?In, ?Yield, ?Await] < ShiftExpression[?Yield, ?Await]
            // RelationalExpression[?In, ?Yield, ?Await] > ShiftExpression[?Yield, ?Await]
            // RelationalExpression[?In, ?Yield, ?Await] <= ShiftExpression[?Yield, ?Await]
            // RelationalExpression[?In, ?Yield, ?Await] >= ShiftExpression[?Yield, ?Await]
            sequence(oneOfSymbols(
                Symbols.lt,
                Symbols.gt,
                Symbols.lteq,
                Symbols.gteq,
            ), shiftExpression),
            // RelationalExpression[?In, ?Yield, ?Await] instanceof ShiftExpression[?Yield, ?Await]
            sequence(keyword(Keywords._instanceof), shiftExpression),
            // [+In] RelationalExpression[+In, ?Yield, ?Await] in ShiftExpression[?Yield, ?Await]
            sequence(keyword(Keywords._in), shiftExpression),
        )
    )(stream);
}

function shiftExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // AdditiveExpression[?Yield, ?Await]
        additiveExpression,
        // ShiftExpression[?Yield, ?Await] << AdditiveExpression[?Yield, ?Await]
        // ShiftExpression[?Yield, ?Await] >> AdditiveExpression[?Yield, ?Await]
        // ShiftExpression[?Yield, ?Await] >>> AdditiveExpression[?Yield, ?Await]
        sequence(oneOfSymbols(
            Symbols.shiftLeft,
            Symbols.shiftRight,
            Symbols.shiftRight3,
        ), additiveExpression)
    )(stream);
}

function additiveExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // MultiplicativeExpression[?Yield, ?Await]
        multiplicativeExpression,
        // AdditiveExpression[?Yield, ?Await] + MultiplicativeExpression[?Yield, ?Await]
        // AdditiveExpression[?Yield, ?Await] - MultiplicativeExpression[?Yield, ?Await]
        sequence(oneOfSymbols(
            Symbols.plus,
            Symbols.minus,
        ), multiplicativeExpression)
    )(stream);
}

function multiplicativeExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // ExponentiationExpression[?Yield, ?Await]
        exponentiationExpression,
        // MultiplicativeExpression[?Yield, ?Await] MultiplicativeOperator ExponentiationExpression[?Yield, ?Await]
        // MultiplicativeOperator : one of
        // * / %
        sequence(oneOfSymbols(
            Symbols.astersik,
            Symbols.div,
            Symbols.percent,
        ), exponentiationExpression)
    )(stream);
}

function exponentiationExpression(stream : TokenStream) : void {
    leftHandRecurciveRule(
        // UnaryExpression[?Yield, ?Await]
        unaryExpression,
        // UpdateExpression[?Yield, ?Await] ** ExponentiationExpression[?Yield, ?Await]
        sequence(multiSymbol(Symbols.astersik2), exponentiationExpression),
    )(stream);
}

function logicalAndExpression(stream : TokenStream) : void {
    return leftHandRecurciveRule(
        // BitwiseORExpression[?In, ?Yield, ?Await]
        bitwiseOrExpression,
        // LogicalANDExpression[?In, ?Yield, ?Await] && BitwiseORExpression[?In, ?Yield, ?Await]
        sequence(multiSymbol(Symbols.and), bitwiseOrExpression),
    )(stream);
}

function logicalOrExpression(stream : TokenStream) : void {
    return leftHandRecurciveRule(
        // LogicalANDExpression[?In, ?Yield, ?Await]
        logicalAndExpression,
        // LogicalORExpression[?In, ?Yield, ?Await] || LogicalANDExpression[?In, ?Yield, ?Await]
        sequence(multiSymbol(Symbols.or), logicalAndExpression)
    )(stream);
}

function coalesceExpression(stream : TokenStream) : void {
    return leftHandRecurciveRule(
        // CoalesceExpressionHead[?In, ?Yield, ?Await] ?? BitwiseORExpression[?In, ?Yield, ?Await]
        bitwiseOrExpression,
        sequence(
            multiSymbol(Symbols.coalesce), bitwiseOrExpression
        )
    )(stream);
}

function shortCircuitExpression(stream : TokenStream) : void {
    return firstOf(
        // LogicalORExpression[?In, ?Yield, ?Await]
        logicalOrExpression,
        // CoalesceExpression[?In, ?Yield, ?Await]
        coalesceExpression,
    )(stream);
}

function conditionalExpression(stream : TokenStream) : void {
    shortCircuitExpression(stream);
    optional(sequence(
        symbol(Symbols.question),
        assignmentExpression,
        symbol(Symbols.colon),
        assignmentExpression,
    ))(stream);
}

function yeildExpression(stream : TokenStream) : void {
    keyword(Keywords._yield)(stream);
    noLineTerminatorHere(stream);
    optional(symbol(Symbols.astersik))(stream);
    assignmentExpression(stream);
}

function arrowFunction(stream : TokenStream) : void {
    // ArrowParameters[?Yield, ?Await] [no LineTerminator here] => ConciseBody[?In]
    firstOf(bindingIdentifier, roundBracket)(stream);
    multiSymbol(Symbols.arrow)(stream);
    firstOf(anyBlock, assignmentExpression)(stream);
}

function asyncArrowFunction(stream : TokenStream) : void {
    // async [no LineTerminator here] AsyncArrowBindingIdentifier[?Yield] [no LineTerminator here] => AsyncConciseBody[?In]
    keyword(Keywords._async)(stream);
    bindingIdentifier(stream);
    multiSymbol(Symbols.arrow)(stream);
    firstOf(anyBlock, assignmentExpression)(stream);
}

export function assignmentExpression(stream : TokenStream) : Node {
    return longestOf(
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
            oneOfSymbols(Symbols.eq, ...AssignmentOperator, Symbols.eq2and, Symbols.eq2or, Symbols.eq2questions),
            assignmentExpression,
        )
    )(stream);
}

export function parseJsVarStatement(stream: TokenStream) : VarStatementNode {
    firstOf(keyword(Keywords._var), keyword(Keywords._const), keyword(Keywords._let))(stream);

    const items = commaList(variableDeclaration)(stream);

    optional(symbol(Symbols.semicolon))(stream);
    return {
        type: NodeType.VarStatement,
        items,
    }
}

export function expression(stream : TokenStream) : MultiNode {
    // Expression :
    // AssignmentExpression[?In, ?Yield, ?Await]
    // Expression[?In, ?Yield, ?Await] , AssignmentExpression[?In, ?Yield, ?Await]

    return {
        type: NodeType.Expression,
        items: commaList(assignmentExpression)(stream)
    };
}

export function expressionStatement(stream : TokenStream) : Node {
    //[lookahead ∉ { {, function, async [no LineTerminator here] function, class, let [ }] Expression[+In, ?Yield, ?Await] ;
    notAllowed([
        anyBlock,
        keyword(Keywords._function),
        sequence(keyword(Keywords._async), keyword(Keywords._function, peekNoLineTerminatorHere)),
        keyword(Keywords._class),
        keyword(Keywords._let),
    ], 'expression cannot be started with...')(stream);

    const expr = expression(stream);

    // NOTE here it's optional, but in the spec it's mandatory
    optional(symbol(Symbols.semicolon))(stream);

    return expr;
}

function ifStatement(stream : TokenStream) : IfNode {
    keyword(Keywords._if)(stream);
    const cond = roundBracket(stream);
    const left = parseJsStatement(stream);
    const hasElse = optional(keyword(Keywords._else))(stream);
    let right;
    if (hasElse) {
        right = parseJsStatement(stream);
    }

    return {
        type: NodeType.IfStatement,
        cond: cond,
        left: left,
        right: right,
    }
}
ifStatement.probe = makeIsKeywordNextTokenProbe(Keywords._if);

function breakableStatement(stream : TokenStream) : void {
    longestOf(
        //TODO
        // IterationStatement[?Yield, ?Await, ?Return]
        firstOf(
            // DoWhileStatement[?Yield, ?Await, ?Return]
            sequence(
                keyword(Keywords._do),
                parseJsStatement,
                keyword(Keywords._while),
                roundBracket,
                symbol(Symbols.semicolon),
            ),
            // WhileStatement[?Yield, ?Await, ?Return]
            sequence(
                keyword(Keywords._while),
                roundBracket,
                parseJsStatement,
            ),
            // ForStatement[?Yield, ?Await, ?Return]
            // ForInOfStatement[?Yield, ?Await, ?Return]
            sequence(
                keyword(Keywords._for),
                optional(keyword(Keywords._await)),
                roundBracket,
                parseJsStatement,
            ),
        ),
        // SwitchStatement[?Yield, ?Await, ?Return]
        sequence(keyword(Keywords._case), anyBlock)
    )(stream);
}

function continueStatement(stream : TokenStream) : void {
    keyword(Keywords._continue)(stream);
    optional(
        sequence(
            noLineTerminatorHere,
            bindingIdentifier,
        )
    )(stream),
    symbol(Symbols.semicolon)(stream);
}
continueStatement.probe = makeIsKeywordNextTokenProbe(Keywords._continue);

function breakStatement(stream : TokenStream) : void {
    keyword(Keywords._break),
    optional(
        sequence(
            noLineTerminatorHere,
            bindingIdentifier,
        )
    )(stream),
    symbol(Symbols.semicolon)(stream);
}
breakStatement.probe = makeIsKeywordNextTokenProbe(Keywords._break);

function returnStatement(stream : TokenStream) : void {
    keyword(Keywords._return)(stream);
    optional(
        sequence(
            noLineTerminatorHere,
            expression,
        )
    )(stream),
    symbol(Symbols.semicolon)(stream);
}
returnStatement.probe = makeIsKeywordNextTokenProbe(Keywords._return);

function withStatement(stream : TokenStream) : void {
    keyword(Keywords._with)(stream);
    roundBracket(stream);
    parseJsStatement(stream);
}
withStatement.probe = makeIsKeywordNextTokenProbe(Keywords._with);

function lableStatement(stream : TokenStream) : void {
    // LabelIdentifier[?Yield, ?Await] : LabelledItem[?Yield, ?Await, ?Return]
    //
    bindingIdentifier(stream);
    symbol(Symbols.colon)(stream);
    firstOf(
        // Statement[?Yield, ?Await, ?Return]
        parseJsStatement,
        // FunctionDeclaration[?Yield, ?Await, ~Default]
        functionExpression,
    )(stream);
}

function throwStatement(stream : TokenStream) : void {
    keyword(Keywords._throw)(stream);
    noLineTerminatorHere(stream);
    expression(stream);
    symbol(Symbols.semicolon);
}
throwStatement.probe = makeIsKeywordNextTokenProbe(Keywords._throw);

function tryStatement(stream : TokenStream) : void {
    keyword(Keywords._try)(stream);
    anyBlock(stream);
    optional(sequence(
        keyword(Keywords._catch),
        optional(roundBracket),
        anyBlock,
    ))(stream);
    optional(sequence(
        keyword(Keywords._finally),
        optional(roundBracket),
        anyBlock,
    ))(stream);
}
tryStatement.probe = makeIsKeywordNextTokenProbe(Keywords._try);

export function parseJsStatement(stream : TokenStream) : JsRawNode {
    longestOf(
        // BlockStatement[?Yield, ?Await, ?Return]
        anyBlock,
        // VariableStatement[?Yield, ?Await]
        parseJsVarStatement,
        // EmptyStatement
        symbol(Symbols.semicolon),
        // ExpressionStatement[?Yield, ?Await]
        expressionStatement,
        // IfStatement[?Yield, ?Await, ?Return]
        ifStatement,
        // BreakableStatement[?Yield, ?Await, ?Return]
        breakableStatement,
        // ContinueStatement[?Yield, ?Await]
        continueStatement,
        // BreakStatement[?Yield, ?Await]
        breakStatement,
        // [+Return]ReturnStatement[?Yield, ?Await]
        returnStatement,
        // WithStatement[?Yield, ?Await, ?Return]
        withStatement,
        // LabelledStatement[?Yield, ?Await, ?Return]
        lableStatement,
        // ThrowStatement[?Yield, ?Await]
        throwStatement,
        // TryStatement[?Yield, ?Await, ?Return]
        tryStatement,
        // DebuggerStatement
        sequence(keyword(Keywords._debugger), symbol(Symbols.semicolon)),
    )(stream);

    //TODO remove, the function shuld return void or some type. returnRawNode isn't required since it's called in statementItem
    return returnRawNode(stream);
}

type HoistableDeclaration = FunctionEpressionNode | GeneratorEpressionNode
    | AsyncFunctionEpressionNode | AsyncGeneratorEpressionNode;
function hoistableDeclaration(stream : TokenStream) : HoistableDeclaration {
    return firstOf(
        //NOTE I replaced declation by expression
        // FunctionDeclaration[?Yield, ?Await, ?Default]
        functionExpression,
        // GeneratorDeclaration[?Yield, ?Await, ?Default]
        generatorExpression,
        // AsyncFunctionDeclaration[?Yield, ?Await, ?Default]
        asyncFunctionExpression,
        // AsyncGeneratorDeclaration[?Yield, ?Await, ?Default]
        asyncGeneratorExpression,
    )(stream);
}

type Declaration = HoistableDeclaration | ClassDeclarationNode | VarDeclaraionNode;
function declaration(stream : TokenStream) : Declaration {
    return firstOf(
        // HoistableDeclaration[?Yield, ?Await, ~Default]
        hoistableDeclaration,
        // ClassDeclaration[?Yield, ?Await, ~Default]
        classDeclaration,
        // LexicalDeclaration[+In, ?Yield, ?Await]
        variableDeclaration,
    )(stream);
}

export function statementListItem(stream : TokenStream) : JsRawNode {
    firstOf(
        parseJsStatement,
        declaration,
    )(stream);

    return returnRawNode(stream);
}

// Script
export function parseJsScript(stream : TokenStream) : JssScriptNode {
    return {
        type: NodeType.JsScript,
        items: repeat(statementListItem)(stream),
    }
}

function nameSpaceImport(stream : TokenStream) : ImportSepcifier  {
    const asterisk = symbol(Symbols.astersik)(stream);
    keyword(Keywords._as)(stream);
    const name = importDefaultBinding(stream);

    return {
        name: new ValueWithPosition('*', asterisk.position),
        moduleExportName: name,
    };
}
nameSpaceImport.probe = makeIsSymbolNextTokenProbe(Symbols.astersik);

function importDefaultBinding(stream : TokenStream) : ValueWithPosition<string> {
    //TODO remplace with identifier, identifier should return LiteralToken
    return returnValueWithPosition(identifier)(stream);
}

function importSpecifier(stream : TokenStream) : ImportSepcifier {
    return firstOf(
        //NOTE here the order of rules is changed, at first the longest rule
        // ModuleExportName as ImportedBinding
        map(
            sequence(
                firstOf(
                    // IdentifierName
                    identifierName,
                    // StringLiteral
                    anyString,
                ),
                keyword(Keywords._as),
                importDefaultBinding,
            ),
            function([nameValue, , asValue]) : ImportSepcifier {
                return {
                    name: new ValueWithPosition(nameValue.value, nameValue.position),
                    moduleExportName: asValue,
                };
            }
        ),
        // ImportedBinding
        map(importDefaultBinding, function(value) : ImportSepcifier {
            return {
                name: value,
                moduleExportName: undefined
            };
        }),
    )(stream);
}

function namedImports(stream : TokenStream) : ImportSepcifier[] {
    // NamedImports :
    // { }
    // { ImportsList }
    // { ImportsList , }
    return lazyBlock(TokenType.LazyBlock, function(stream : TokenStream) : ImportSepcifier[] {
        // ImportSpecifier
        // ImportsList , ImportSpecifier
        const result = commaList(importSpecifier, true)(stream);
        if (result.length > 0) {
            optional(comma)(stream);
        }

        if (!stream.eof()) {
            optional(ignoreSpacesAndComments)(stream);
        }

        return result;
    })(stream).parse().items;
}

function toArray<T>(value: NeverVoid<T>) : [T] {
    return [value];
}

function importClause(stream : TokenStream) : ImportSepcifier[] {
    const bindingNameGlobal = map(importDefaultBinding, function(value) : ImportSepcifier {
        return {
            name: new ValueWithPosition('*', value.position),
            moduleExportName: value,
        };
    });
    const clause = firstOf(
        // NameSpaceImport
        map(nameSpaceImport, toArray),
        // NamedImports
        namedImports,
        // ImportedDefaultBinding , NameSpaceImport
        // ImportedDefaultBinding , NamedImports
        map(
            sequence(bindingNameGlobal, comma, firstOf(
                map(nameSpaceImport, toArray),
                namedImports,
            )),
            function([name,,rest]) : ImportSepcifier[] {
                return [name, ...rest];
            },
        ),
        //NOTE changed order
        // TODO the 2 last rules can be joined togather
        // ImportedDefaultBinding
        map(bindingNameGlobal, toArray),
    )(stream);
    keyword(Keywords._from)(stream);

    return clause;
}

export function importDeclaration(stream : TokenStream) : JsImportNode {
    keyword(Keywords._import)(stream);

    const clause = optional(importClause)(stream);
    const fromString = anyString(stream);

    optional(symbol(Symbols.semicolon))(stream);

    return {
        type: NodeType.JsImport,
        path: fromString.value,
        pathPos: fromString.position,
        vars: clause ? clause : [],
    };
}
importDeclaration.probe = makeIsKeywordNextTokenProbe(Keywords._import);

function exportFromClause(stream : TokenStream) : FromClause {
    return firstOf(
        // *
        // * as IdentifierName
        map(
            sequence(
                symbol(Symbols.astersik),
                optional(
                    sequence(
                        keyword(Keywords._as),
                        identifierName,
                    )
                )
            ),
            ([, optIdent]) => {
                if (optIdent) {
                    const [, name] = optIdent;
                    return name;
                } else {
                    return '*';
                }
            }
        ),
        // NamedExports
        namedExports,
    )(stream);
}

function exportSpecifier(stream : TokenStream) : ExportSpecifier {
    return map(sequence(identifierName, optional(
        sequence(keyword(Keywords._as), identifierName),
    )), function([ident1,opt]) : ExportSpecifier {
        if (opt) {
            const [, ident2] = opt;
            return new ExportSpecifier(ident1, ident2);
        } else {
            return new ExportSpecifier(ident1);
        }
    })(stream);
}

function namedExports(stream : TokenStream) : NamedExports {
    // { }
    // { ExportsList }
    // { ExportsList , }
    return lazyBlock(TokenType.LazyBlock, function(stream : TokenStream) : NamedExports {

        // ExportSpecifier
        // ExportsList , ExportSpecifier
        const result = commaList(exportSpecifier, true)(stream);
        if (result.length > 0) {
            optional(comma)(stream);
        }

        if (!stream.eof()) {
            optional(ignoreSpacesAndComments)(stream);
        }

        return result;
    })(stream).parse().items;
}

function exportDeclaration(stream : TokenStream) : JsRawNode {
    keyword(Keywords._export)(stream);
    firstOf(
        // export ExportFromClause FromClause ;
        map(
            sequence(exportFromClause, keyword(Keywords._from), anyString, symbol(Symbols.semicolon)),
            ([clauseToken,,pathToken]) => {
                return new ExportFromClause(clauseToken, pathToken);
            }
        ),
        // export NamedExports ;
        map(
            sequence(namedExports, symbol(Symbols.semicolon)),
            ([items,]) => items
        ),
        // export VariableStatement[~Yield, ~Await]
        parseJsVarStatement,
        // export Declaration[~Yield, ~Await]
        declaration,
        // export default HoistableDeclaration[~Yield, ~Await, +Default]
        map(
            sequence(keyword(Keywords._default), hoistableDeclaration),
            ([, value]) => value,
        ),
        // export default ClassDeclaration[~Yield, ~Await, +Default]
        map(
            sequence(keyword(Keywords._default), classDeclaration),
            ([, value]) => value,
        ),
        // export default [lookahead ∉ { function, async [no LineTerminator here] function, class }] AssignmentExpression[+In, ~Yield, ~Await] ;
        sequence(
            keyword(Keywords._default),
            notAllowed([
                keyword(Keywords._function),
                sequence(keyword(Keywords._async), keyword(Keywords._function, peekNoLineTerminatorHere)),
                keyword(Keywords._class),
            ], 'export declaration cannot be started with...'),
            assignmentExpression,
            symbol(Symbols.semicolon)
        )
    )(stream);

    return returnRawNode(stream);
}
exportDeclaration.probe = makeIsKeywordNextTokenProbe(Keywords._export);

export function moduleItem(stream : TokenStream) : JsRawNode | JsImportNode {
    return firstOf(
        // ImportDeclaration
        importDeclaration,
        // ExportDeclaration
        exportDeclaration,
        // StatementListItem
        statementListItem,
    )(stream);
}

export function propertyName(stream : TokenStream) : void {
    firstOf(
        // LiteralPropertyName
        identifierName,
        anyString,
        numericLiteral,
        // ComputedPropertyName[?Yield, ?Await]
        block(TokenType.SquareBrackets, assignmentExpression)
    )(stream);
}

export function parseJsModule(stream : TokenStream) : JsModuleNode {
    return {
        type: NodeType.JsModule,
        items: strictLoop(moduleItem)(stream),
    };
}
