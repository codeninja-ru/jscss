import { Token } from "token";
import { Node } from "./syntaxTree";
import { TokenCollection } from './tokenCollection';

export type SyntaxRuleFn = (token: Token) => boolean;
export interface SyntaxRule {
    test: SyntaxRuleFn;
}

export class SyntaxRule implements SyntaxRule {
    constructor(test: SyntaxRuleFn) {
        this.test = test.bind(this);
    }
}

export interface SyntaxIterator<T> {
    isLast(): boolean;
    next(): SyntaxIterator<T>;
    value(): T
}

export interface SyntaxRules {
    iterator(): SyntaxIterator<SyntaxRule>;
    makeNode(parsedTokens: TokenCollection) : Node;
}

export class ArraySyntaxIterator<T> implements SyntaxIterator<T> {
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

export class ArraySyntaxRules implements SyntaxRules {
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
