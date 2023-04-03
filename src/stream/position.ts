export interface Position {
    readonly line: number;
    readonly col: number;
}

export class Position implements Position {
    constructor(readonly line : number,
               readonly col: number) {

    }
}
