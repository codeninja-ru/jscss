//TODO be more consiste with https://drafts.css-houdini.org/css-typed-om-1/#intro
interface Unit<S extends Suffix> {
    readonly value : number;
    readonly suffix : S;

    toString() : string;
    add(value : Unit<S> | number) : Unit<S>;
    minus(value : Unit<S> | number) : Unit<S>;
    equal(value : any) : boolean;
}

type Suffix = 'px' | 'em' | '%';

interface PxUnit extends Unit<'px'> {
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

interface EmUnit extends Unit<'em'>{
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

interface PercentUnit extends Unit<'%'>{
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

type Class<T> = {
    new (value : number) : T;
    valueOf(value : Number) : T;
};

export function createClass<S extends Suffix>(suffix : S) : Class<Unit<S>> {
    return class BasicDemention implements Unit<S> {
        readonly suffix = suffix;
        constructor(readonly value : number) {
        }

        static valueOf(value : number) {
            return new BasicDemention(value);
        }

        toString() : string {
            return this.value + suffix;
        }

        add(value : Unit<S> | number) : Unit<S> {
            if (typeof value == 'number') {
                return new BasicDemention(this.value + value);
            } else if (value.suffix == this.suffix) {
                return new BasicDemention(this.value + value.value);
            } else {
                throw new Error(`incompatible types. Cound not add ${this} to ${value}`);
            }
        }

        minus(value : Unit<S> | number) : Unit<S> {
            if (typeof value == 'number') {
                return new BasicDemention(this.value - value);
            } else if (value.suffix == this.suffix) {
                return new BasicDemention(this.value - value.value);
            } else {
                throw new Error(`incompatible types. Cound not minus ${this} to ${value}`);
            }
        }

        equal(value : any) : boolean {
            if (value == this) {
                return true;
            } else if(value instanceof BasicDemention) {
                return value.suffix == this.suffix && value.value == this.value;
            }

            return false;
        }
    }
}

type OneOfUnit = (PxUnit | EmUnit | PercentUnit);

export class Units {
    private constructor() {
        throw new Error('instnace of a Unit cannot be created');
    }

    static fromString<T>(str : string) : OneOfUnit {
        const regExp = /^(([\+\-]*\d*\.*\d+[eE])?([\+\-]*\d*\.*\d+))(px|cm|mm|in|pt|pc|em|ex|deg|rad|grad|ms|s|hz|khz|%)$/i;
        const match = str.match(regExp);
        if (match) {
            const numeric = match[1];
            const suffix = match[4];

            switch (suffix) {
                case 'px':
                    return new Px(Number.parseFloat(numeric));
                case 'em':
                    return new Em(Number.parseFloat(numeric));
                case '%':
                    return new Percent(Number.parseFloat(numeric));
                default:
                    throw new Error('unsupported suffix ' + suffix);

            }
        } else {
            throw new Error('cannot parse ' + str);
        }
    }
}

export const Px = createClass('px') as Class<PxUnit>;
export const Em = createClass('em') as Class<EmUnit>;
export const Percent = createClass('%') as Class<PercentUnit>;

//TODO unit convertion
