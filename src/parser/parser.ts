import { Keywords } from "keyworkds";
import { CommentToken, LiteralToken, Token, TokenType } from "token";
import { isAnyBlock, isAnyLiteral, isAnyString, isComment, isKeyword, or } from "./rules";
import { CommentNode, Node, NodeType, SyntaxTree } from "./syntaxTree";


type SyntaxRuleFn = (token: Token) => boolean;
interface SyntaxRule {
    test: SyntaxRuleFn;
}

function isSpaceToken(token: Token): boolean {
    return (token.type == TokenType.Space)
        || (token.type == TokenType.Comment)
        || (token.type == TokenType.MultilineComment);
}

interface TokenCollection {
    push(parsedToken: Token): void;
    items(): readonly Token[];
    rawValue(): string;
}

class TokenCollection implements TokenCollection {
    constructor(private array: Token[] = []) {
    }

    push(parsedToken: Token): void {
        this.array.push(parsedToken);
    }

    items(): readonly Token[] {
        return this.array.filter((token) => !isSpaceToken(token));
    }

    rawValue(): string {
        return this.array.map(item => item.rawValue).join('');
    }
}

class SyntaxRule implements SyntaxRule {
    constructor(test: SyntaxRuleFn) {
        this.test = test.bind(this);
    }
}

interface SyntaxIterator<T> {
    isLast(): boolean;
    next(): SyntaxIterator<T>;
    value(): T
}

interface SyntaxRules {
    iterator(): SyntaxIterator<SyntaxRule>;
    makeNode(parsedTokens: TokenCollection) : Node;
}

class ArraySyntaxIterator<T> implements SyntaxIterator<T> {
    constructor(private readonly items: T[],
                private readonly idx: number = 0) {
    }

    isLast(): boolean {
        return this.idx >= this.items.length - 1;
    }

    next(): SyntaxIterator<T> {
        if (this.isLast()) {
            throw new Error('there is no next element');
        }

        return new ArraySyntaxIterator<T>(this.items, this.idx + 1);
    }

    value(): T {
        return this.items[this.idx];
    }
}

class ArraySyntaxRules implements SyntaxRules {
    constructor(private readonly rules: SyntaxRule[],
                private makeNodeCallback: (parsedTokens: readonly Token[], rawValue: string) => Node) {
    }

    iterator(): SyntaxIterator<SyntaxRule> {
        return new ArraySyntaxIterator<SyntaxRule>(this.rules);
    }

    makeNode(parsedTokens: TokenCollection) : Node {
        return this.makeNodeCallback(parsedTokens.items(), parsedTokens.rawValue());
    }
}

const JS_IMPORT = new ArraySyntaxRules([
    new SyntaxRule(isKeyword(Keywords._import)),
    new SyntaxRule(or(isAnyBlock(), isAnyLiteral())),
    new SyntaxRule(isKeyword(Keywords._from)),
    new SyntaxRule(isAnyString()),
], function([, vars, , path], rawValue) {
    console.log(arguments);
    return {
        type: NodeType.JsImport,
        path: (path as LiteralToken).value,
        vars: vars.rawValue,
        rawValue,
    };
});

const COMMENT = new ArraySyntaxRules([
    new SyntaxRule(isComment()),
], ([value]) => {
    return {
        type: NodeType.Comment,
        value: (value as CommentToken).value,
    } as CommentNode;
});

interface ParserStep {
    nextStep(token: Token): SomeParserStep;
}

class ItParserStep implements ParserStep {
    constructor(private iterator: SyntaxIterator<SyntaxRule>,
                private parsedTokenCollection: TokenCollection,
                private syntaxRules: SyntaxRules) {}

    private nextParser(nextIt: SyntaxIterator<SyntaxRule>): SomeParserStep {
        if (nextIt.isLast()) {
            return new LastStep(this.syntaxRules, this.parsedTokenCollection);
        } else {
            return new ItParserStep(nextIt, this.parsedTokenCollection, this.syntaxRules);
        }
    }

    nextStep(token: Token): SomeParserStep {
        if (this.iterator.isLast()) {
            throw new Error('no next step');
        }

        const nextIt = this.iterator.next();

        if (isSpaceToken(token)) {
            this.parsedTokenCollection.push(token);
            return this;
        } else if (nextIt.value().test(token)) {
            this.parsedTokenCollection.push(token);
            return this.nextParser(nextIt);
        }

        return ErrorParserStep.NOT_MATCHED;
    }
}

type SomeMatcher = Matcher | LastParserStep | ErrorMatcher;

function isNextStepMatcher(matcher: SomeMatcher): matcher is Matcher {
    return (matcher as Matcher).probe !== undefined;
}

interface Matcher {
    probe(token: Token): SomeMatcher;
    hasActiveParsers(): boolean;
}

interface ErrorMatcher {
    error(): ErrorParserStep;
}

function isErrorMatcher(matcher: SomeMatcher): matcher is ErrorMatcher {
    return (matcher as ErrorMatcher).error != undefined;
}

class LastErrorMatcher implements ErrorMatcher {
    constructor(private errors: readonly ErrorParserStep[]) {
    }

    error(): ErrorParserStep {
        return this.errors[this.errors.length - 1];
    }
}

class StringErrorMatcher implements ErrorMatcher {
    constructor(private errorMessage: string) {
    }

    error(): ErrorParserStep {
        return new ErrorParserStep(this.errorMessage);
    }
}

interface LastParserStep {
    node(): Node;
}

interface ErrorParserStep {
    readonly error: string;
}

class ErrorParserStep {
    static readonly NOT_MATCHED = new ErrorParserStep('not matcher');
    constructor(public readonly error: string) {
    }
}

type SomeParserStep = LastParserStep | ParserStep | ErrorParserStep;

function isLastParserStep(parserStep: SomeParserStep | SomeMatcher): parserStep is LastParserStep {
    return (parserStep as LastStep).node !== undefined;
}

function isErrorParserStep(parserStep: SomeParserStep): parserStep is ErrorParserStep {
    return (parserStep as ErrorParserStep).error !== undefined;
}

class LastStep implements LastParserStep {
    constructor(private syntaxRules: SyntaxRules,
                private parsedTokens: TokenCollection) {
    }

    node(): Node {
        return this.syntaxRules.makeNode(this.parsedTokens);
    }
}

class ParserMatcher implements Matcher {
    constructor(private readonly items: ParserStep[]) {}

    probe(token: Token): SomeMatcher {
        const result = [];
        const errors: ErrorParserStep[] = [];

        for (const item of this.items) {
            const nextStep = item.nextStep(token);
            if (isLastParserStep(nextStep)) {
                return nextStep;
            } else if (isErrorParserStep(nextStep)) {
                errors.push(nextStep);
            } else {
                result.push(nextStep);
            }
        }

        if (result.length == 0) {
            if (errors.length != 0) {
                return new LastErrorMatcher(errors);
            } else {
                return new StringErrorMatcher(`unexpected token ${token}`);
            }
        }

        return new ParserMatcher(result);
    }

    hasActiveParsers(): boolean {
        return this.items.length > 0;
    }
}

class FirstParserMatcher implements Matcher {
    constructor(private readonly items: readonly SyntaxRules[]) {
    }

    probe(token: Token): SomeMatcher {
        const result = [];

        for (const item of this.items) {
            const it = item.iterator();
            if (it.value().test(token)) {
                const parsedTokens = new TokenCollection([token]);
                if (it.isLast()) {
                    return new LastStep(item, parsedTokens);
                } else {
                    result.push(new ItParserStep(it, parsedTokens, item));
                }
            }
        }

        if (result.length == 0) {
            throw new Error(`unexpected token ${token}`)
        }

        return new ParserMatcher(result);
    }

    hasActiveParsers(): boolean {
        return false;
    }
}

interface Parser {
    parse(tokens: Token[]): SyntaxTree;
}

class Parser implements Parser {
    private readonly matcher: Matcher;
    constructor(syntaxRules: readonly SyntaxRules[]) {
        this.matcher = new FirstParserMatcher(syntaxRules);
    }

    parse(tokens: Token[]): SyntaxTree {
        let syntaxTree = [];
        let matcher: SomeMatcher = this.matcher;
        for (const token of tokens) {
            matcher = matcher.probe(token);
            if (isLastParserStep(matcher)) {
                let node = matcher.node();
                syntaxTree.push(node);
                matcher = this.matcher;
            } else if (isErrorMatcher(matcher)) {
                throw new Error(matcher.error().error);
            }
        }

        if (isNextStepMatcher(matcher) && matcher.hasActiveParsers()) {
            throw new Error('unexpeced end of the file');
        }

        return syntaxTree;
    }
}

const TopLevelParser = new Parser([
    JS_IMPORT,
    COMMENT,
]);

export function parse(tokens: Token[]): SyntaxTree {
    return TopLevelParser.parse(tokens);
}
