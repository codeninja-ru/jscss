import { Token } from 'token';
import { isSpaceToken } from './parser';

export interface TokenCollection {
    push(parsedToken: Token): void;
    items(): readonly Token[];
    rawValue(): string;
}

export class ArrayTokenCollection implements TokenCollection {
    constructor(private array: Token[] = []) {
    }

    push(parsedToken: Token): void {
        this.array.push(parsedToken);
    }

    items(): readonly Token[] {
        return this.array.filter((token) => !isSpaceToken(token));
    }

    rawValue(): string {
        return this.array.map(item => item.value).join('');
    }
}
