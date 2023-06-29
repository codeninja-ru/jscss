import { Token } from "token";
import { Position } from "stream/position";
import { isSpaceOrComment } from "./tokenStreamReader";

export function isSourceFragment(obj : any) : obj is SourceFragment {
    return obj instanceof ArraySourceFragment
    || obj instanceof LeftTrimSourceFragment;
}

export interface SourceFragment {
    readonly position: Position;
    value : string;
    readonly tokens: Token[];
}

export class ArraySourceFragment implements SourceFragment {
    constructor(private readonly _startPosition : Position,
                private readonly _tokens : Token[]) {}

    get position() : Position {
        return this._startPosition;
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
        const pos = this.findStartPos();
        if (this.fragment.tokens[pos]) {
            return this.fragment.tokens[pos].position;
        } else {
            return this.fragment.position;
        }
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
