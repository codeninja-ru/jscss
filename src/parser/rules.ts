import { Keyword } from 'keyworkds';
import { Token, TokenType } from 'token';

export type SyntaxRuleFn = (token: Token) => boolean;

export function isKeyword(keyword: Keyword): SyntaxRuleFn {
    return function(token: Token): boolean {
        return token.type == TokenType.Literal && keyword.equal(token);
    };
}

export function or(...funcs: SyntaxRuleFn[]): SyntaxRuleFn {
    return function(token: Token): boolean {
        for(var fn of funcs) {
            if (fn(token)) {
                return true;
            }
        }

        return false;
    };
}

export function isAnyBlock(): SyntaxRuleFn {
    return function(token: Token): boolean {
        return token.type == TokenType.Block || token.type == TokenType.LazyBlock;
    }
}

export function isAnyLiteral(): SyntaxRuleFn {
    return function(token: Token) {
        return token.type == TokenType.Literal;
    }
}

export function isAnyString(): SyntaxRuleFn {
    return function(token: Token) {
        return token.type == TokenType.String;
    }
}

export function isComment(): SyntaxRuleFn {
    return function(token: Token) {
        return token.type == TokenType.Comment || token.type == TokenType.MultilineComment;
    }
}

interface ISlotResponse {
    readonly type: SlotResponseType;
}
export enum SlotResponseType {
    MoveNext,
    Error
}
class MoveNextSlotResponse implements ISlotResponse {
    readonly type = SlotResponseType.MoveNext
} //TODO empty class can be replaced by constants since it's overkill to create a new class every time
class ErrorSlotResponse implements ISlotResponse {
    readonly type = SlotResponseType.Error;
    constructor(readonly errorMessage: string) {}
}

export type SlotResponse = MoveNextSlotResponse | ErrorSlotResponse;
export type SlotFn = (token: Token) => SlotResponse;
