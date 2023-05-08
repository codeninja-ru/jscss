export interface Position {
    readonly line: number;
    readonly col: number;
}

export class Position implements Position {
    static readonly ZERO = new Position(0, 0);
    constructor(readonly line : number,
               readonly col: number) {

    }
}
