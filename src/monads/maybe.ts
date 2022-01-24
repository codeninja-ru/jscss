export class Maybe<T> {
    private constructor(private value: T | null) { }

    static none<T>(): Maybe<T> {
        return new Maybe<T>(null);
    }

    static some<T>(value: T): Maybe<T> {
        if (!value) {
            throw new Error('provided value must not be empty');
        }

        return new Maybe<T>(value);
    }

    static fromValue<T>(value: T | null): Maybe<T> {
        return new Maybe<T>(value);
    }

    getOrElse(defaultValue: T) {
        if (this.value != null) {
            return this.value;
        } else {
            return defaultValue;
        }
    }

    isEmpty() {
        return this.value == null;
    }

}
