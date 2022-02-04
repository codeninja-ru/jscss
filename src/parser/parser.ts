import { Keywords } from "keyworkds";
import { CommentToken, Token } from "token";
import { isAnyBlock, isAnyLiteral, isAnyString, isComment, isKeyword, or } from "./rules";
import { CommentNode, Node, NodeType, SyntaxTree } from "./syntaxTree";
type SyntaxRuleFn = (token: Token) => boolean;
interface SyntaxRule {
    test: SyntaxRuleFn;
}

interface TokenCollection {
    push(parsedToken: Token): void;
    items(): readonly Token[];
}

class TokenCollection implements TokenCollection {
    constructor(private array: Token[] = []) {
    }

    push(parsedToken: Token): void {
        this.array.push(parsedToken);
    }

    items(): readonly Token[] {
        return this.array;
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
        return this.idx >= this.items.length;
    }

    next(): SyntaxIterator<T> {
        return new ArraySyntaxIterator<T>(this.items, this.idx + 1);
    }

    value(): T {
        return this.items[this.idx];
    }
}

class ArraySyntaxRules implements SyntaxRules {
    constructor(private readonly rules: SyntaxRule[],
                private makeNodeCallback: (parsedTokens: readonly Token[]) => Node) {
    }

    iterator(): SyntaxIterator<SyntaxRule> {
        return new ArraySyntaxIterator<SyntaxRule>(this.rules);
    }

    makeNode(parsedTokens: TokenCollection) : Node {
        return this.makeNodeCallback(parsedTokens.items());
    }
}

const JS_IMPORT = new ArraySyntaxRules([
    new SyntaxRule(isKeyword(Keywords._import)),
    new SyntaxRule(or(isAnyBlock(), isAnyLiteral())),
    new SyntaxRule(isKeyword(Keywords._from)),
    new SyntaxRule(isAnyString()),
], ([, vars, , path]) => {
    return {
        type: NodeType.JsImport,
        path: path,
        vars: vars,
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
    isError(): boolean;
    nextStep(token: Token): ParserStep;
    hasNextStep(): boolean;
    lastStep(): CanBeLastStep;
}

class ErrorParserStep implements ParserStep {
    static readonly INSTANCE = new ErrorParserStep();

    isError(): boolean {
        return true;
    }

    nextStep(_: Token): ParserStep {
        throw new Error('unexpected call');
    }

    hasNextStep() : boolean {
        throw new Error('unexpected call');
    }

    lastStep(): CanBeLastStep {
        throw new Error('unexpected call');
    }
}

class ItParserStep implements ParserStep {
    constructor(private iterator: SyntaxIterator<SyntaxRule>,
                private parsedTokenCollection: TokenCollection,
                private syntaxRules: SyntaxRules) {}

    isError(): boolean {
        return false;
    }

    nextStep(token: Token): ParserStep {
        if (this.iterator.isLast()) {
            throw new Error('no next step');
        }

        const nextIt = this.iterator.next();
        if (nextIt.value().test(token)) {
            this.parsedTokenCollection.push(token);
            return new ItParserStep(nextIt, this.parsedTokenCollection, this.syntaxRules);
        }

        return ErrorParserStep.INSTANCE;
    }

    hasNextStep() : boolean {
        return !this.iterator.isLast();
    }

    lastStep(): CanBeLastStep {
        if (this.iterator.isLast()) {
            return new LastStep(this.syntaxRules, this.parsedTokenCollection);
        }

        return NotLastStep.INSTANCE;
    }


}

interface Matcher {
    probe(token: Token): Matcher;
    node(): Node;
    hasNext(): boolean;
}

interface CanBeLastStep {
    node(): Node;
    isLast(): boolean;
}

class LastStep implements CanBeLastStep {
    constructor(private syntaxRules: SyntaxRules,
                private parsedTokens: TokenCollection) {
    }

    node(): Node {
        return this.syntaxRules.makeNode(this.parsedTokens);
    }

    isLast(): boolean {
        return true;
    }
}

class NotLastStep implements CanBeLastStep {
    static readonly INSTANCE = new NotLastStep();

    isLast(): boolean {
        return false;
    }

    node(): Node {
        throw new Error("It's not a last step");
    }
}


class ParserMatcher implements Matcher {
    constructor(private readonly items: ParserStep[]) {}

    probe(token: Token): Matcher {
        const result = [];

        for (const item of this.items) {
            const nextStep = item.nextStep(token);
            if (!nextStep.isError()) {
                result.push(nextStep);
            }
        }

        if (result.length == 0) {
            throw new Error(`unexpected token ${token}`)
        }

        return new ParserMatcher(result);
    }

    hasNext(): boolean {
        return this.items
            .some((item) => !item.hasNextStep())
    }

    node() : Node {
        const lst = this.items
            .find((item) => !item.hasNextStep());
        console.log(this.items);

        if (lst) {
            return lst
                .lastStep()
                .node();
        }

        throw new Error('program error, node() has been called but there is no last step')
    }
}

class FirstParserMatcher implements Matcher {
    constructor(private readonly items: readonly SyntaxRules[]) {
    }

    probe(token: Token): Matcher {
        const result = [];

        for (const item of this.items) {
            const it = item.iterator();
            if (it.value().test(token)) {
                const parsedTokens = new TokenCollection([token]);
                result.push(new ItParserStep(it, parsedTokens, item));
            }
        }

        if (result.length == 0) {
            throw new Error(`unexpected token ${token}`)
        }

        return new ParserMatcher(result);
    }

    hasNext(): boolean {
        return true;
    }

    node(): Node {
        throw new Error('unexpected call');
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
        let matcher = this.matcher;
        for (const token of tokens) {
            if (matcher.hasNext()) {
                matcher = matcher.probe(token);
            } else {
                let node = matcher.node();
                syntaxTree.push(node);
            }
        }

        if (matcher.hasNext()) {
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
