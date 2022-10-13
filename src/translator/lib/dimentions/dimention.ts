interface Dimention<S extends Suffix> {
    readonly value : number;
    readonly suffix : S;

    toString() : string;
    add(value : Dimention<S> | number) : Dimention<S>;
    minus(value : Dimention<S> | number) : Dimention<S>;
    equal(value : any) : boolean;
}

type Suffix = 'px' | 'em' | '%';

interface PxDimention extends Dimention<'px'> {
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

interface EmDimention extends Dimention<'em'>{
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

interface PercentDimention extends Dimention<'%'>{
    add(value : this | number) : this;
    minus(value : this | number) : this;
}

type Class<T> = {new (value : number) : T};

export function createClass<S extends Suffix>(suffix : S) : Class<Dimention<S>> {
    return class BasicDemention implements Dimention<S> {
        readonly suffix = suffix;
        constructor(readonly value : number) {
        }

        toString() : string {
            return this.value + suffix;
        }

        add(value : Dimention<S> | number) : Dimention<S> {
            if (typeof value == 'number') {
                return new BasicDemention(this.value + value);
            } else if (value.suffix == this.suffix) {
                return new BasicDemention(this.value + value.value);
            } else {
                throw new Error(`incompatible types. Cound not add ${this} to ${value}`);
            }
        }

        minus(value : Dimention<S> | number) : Dimention<S> {
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

export const Px = createClass('px') as Class<PxDimention>;
export const Em = createClass('em') as Class<EmDimention>;
export const Percent = createClass('%') as Class<PercentDimention>;
