import { Keyword, Keywords } from 'keyworkds';
import { Token, TokenType } from 'token';
import { IStatement } from './statement';

type SyntaxRuleFn = (token: Token) => boolean;

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

interface TokenEater {
    eat(token: Token): TokenEaterResponse;
    //digest(): Statement;
}

interface ISlotResponse {
    readonly type: SlotResponseType;
}
enum SlotResponseType {
    MoveNext,
    End,
    Skip,
    Error
}
class MoveNextSlotResponse implements ISlotResponse { readonly type = SlotResponseType.MoveNext } //TODO empty class can be replaced by constants since it's overkill to create a new class every time
class EndSlotResponse implements ISlotResponse { readonly type = SlotResponseType.End}
class SkipSlotResponse implements ISlotResponse { readonly type = SlotResponseType.Skip}
class ErrorSlotResponse implements ISlotResponse {
    readonly type = SlotResponseType.Error;
    constructor(readonly errorMessage: string) {}
}

type errorMessageFn = (token: Token) => string;
type SlotResponse = MoveNextSlotResponse | ErrorSlotResponse | EndSlotResponse | SkipSlotResponse;
type SlotFn = (token: Token) => SlotResponse;

function slot(ruleFn: SyntaxRuleFn, errorFn?: errorMessageFn) : SlotFn {
    return function(token: Token) : SlotResponse {
        if (ruleFn(token)) {
            return new MoveNextSlotResponse();
        } else if (errorFn) {
            return new ErrorSlotResponse(errorFn(token));
        } else {
            return new EndSlotResponse();
        }
    };
}

enum TokenEaterResponeType {
    Error,
    MoveNext,
    EndOfSentance,
    Skip,
}

interface ITokenEaterResponse {
    type: TokenEaterResponeType;
}

class ErrorTokenEaterResponse implements ITokenEaterResponse {
    readonly type = TokenEaterResponeType.Error;
    constructor(readonly errorMessage: string) {}
}

class MoveNextTokenEaterResponse implements ITokenEaterResponse {
    readonly type = TokenEaterResponeType.MoveNext;
}

class EndOfSentanceTokenEaterResponse implements ITokenEaterResponse {
    readonly type = TokenEaterResponeType.EndOfSentance;
}

class SkipTokenEaterResponse implements ITokenEaterResponse {
    readonly type = TokenEaterResponeType.Skip;
}

type TokenEaterResponse = ErrorTokenEaterResponse | MoveNextTokenEaterResponse | EndOfSentanceTokenEaterResponse | SkipTokenEaterResponse;

abstract class AbstractSyntax implements TokenEater {
    protected slotNumber = 0;
    protected abstract slots: SlotFn[];

    eat(token: Token): TokenEaterResponse {
        const slot = this.slots[this.slotNumber];
        if (slot) {
            const resp = slot(token);
            switch (resp.type) {
                case SlotResponseType.MoveNext:
                    return this.slotNumber >= this.slots.length - 1 ? new EndOfSentanceTokenEaterResponse() : new MoveNextTokenEaterResponse();
                case SlotResponseType.End:
                    return new EndOfSentanceTokenEaterResponse();
                case SlotResponseType.Error:
                    return new ErrorTokenEaterResponse(resp.errorMessage);
                case SlotResponseType.Skip:
                default:
                    throw new Error('SlotReponse is not supported');
            }
        } else {
            throw new Error('no more slotes')
        }
    }

    digest() {}
}

export class JsImportSyntax extends AbstractSyntax {
    protected slots = [
        slot(isKeyword(Keywords._import)),
        slot(or(isAnyBlock(), isAnyLiteral()), (token: Token) => `unexpected token ${token}`),
        slot(isKeyword(Keywords._from), (token: Token) => `from is expected`),
        slot(isAnyString(), (token: Token) => `string is expected, but ${token} was given `),
    ];
}

export class CommentSyntax extends AbstractSyntax {
    protected slots = [
        slot(isComment()),
    ];
}

export class CssImportSyntax extends AbstractSyntax {
    protected slots = [
        slot(isKeyword(Keywords.css._import)),
        slot(isAnyString()),
    ];
}

interface IStatementParser {
    walk(token: Token): IStatement | null;
}

interface TokenEaterConstructor {
    new (): TokenEater;
}

class StatementParser implements IStatementParser {
    protected tokenEaterInstance: TokenEater;
    constructor(private tokenEater: TokenEaterConstructor) {
        this.tokenEaterInstance = this.makeTokenEater();
    }

    protected makeTokenEater(): TokenEater {
        return new this.tokenEater();
    }

    walk(token: Token): IStatement | null {
        const resp = this.tokenEaterInstance.eat(token);

        switch(resp.type) {
            case TokenEaterResponeType.EndOfSentance:
                this.tokenEaterInstance = this.makeTokenEater();
                break;
            case TokenEaterResponeType.Error:
                this.tokenEaterInstance = this.makeTokenEater();
                break;
            case TokenEaterResponeType.MoveNext:
            case TokenEaterResponeType.Skip:
            default:
                throw new Error('response type is unsupported');
        }
    }

}
