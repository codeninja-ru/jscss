import { Token } from "token";
import { Position } from "stream/position";
import { isSpaceOrComment } from "./tokenStreamReader";

export interface SourceFragment {
    readonly position: Position;
    value : string;
    readonly tokens: Token[];
}

export class ArraySourceFragment implements SourceFragment {
    constructor(private _tokens : Token[]) {
    }

    get position() : Position {
        return this._tokens[0].position;
    }

    get value() : string {
        let result = '';
        this._tokens.forEach(token => {
            result += token.value;
        });

        return result;
    }

    get tokens() : Token[] {
        return this._tokens;
    }
}

export class LeftTrimSourceFragment implements SourceFragment {
    private startPos : number | undefined;
    constructor(private fragment : SourceFragment) {
    }

    private findStartPos() : number {
        if (this.startPos === undefined) {
            const tokens = this.fragment.tokens;
            this.startPos = 0;
            for (var i = 0; i < tokens.length; i++) {
                if (isSpaceOrComment(tokens[i])) {
                    this.startPos = i + 1;
                } else {
                    break;
                }
            }
        }

        return this.startPos;
    }

    get position() : Position {
        return this.fragment.tokens[this.findStartPos()].position;
    }

    get value() : string {
        let result = '';

        const tokens = this.fragment.tokens;
        for (var i = this.findStartPos(); i < tokens.length; i++) {
            result += tokens[i].value;
        }

        return result;
    }

    get tokens() : Token[] {
        return this.fragment.tokens.slice(this.findStartPos());
    }
}
