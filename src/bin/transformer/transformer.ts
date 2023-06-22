export interface Transformer<S, D> {
    transform(src : S) : D;
}
