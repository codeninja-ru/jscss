interface Color {
    toString() : string;
    toHexString() : string;
}

function pad2(n : string) {
    return n.length > 1 ? n : "0" + n;
}

export class HexColor implements Color {
    constructor(readonly hex : string) {
    }

    static fromString(hex : string) : HexColor {
        if (!(typeof hex == 'string' && hex.match(/#[a-fA-F0-9]{3,12}/m))) {
            throw new Error(`${hex} is not a hex color`);
        }
        return new HexColor(hex);
    }

    toHexString() : string {
        return this.hex;
    }

    toString() : string {
        return this.hex;
    }
}

export class RgbColor implements Color {
    constructor(readonly r: number,
               readonly b: number,
               readonly g: number) {

    }

    toHexString() : string {
        return "#" + pad2(this.r.toString(16)) + pad2(this.g.toString(16)) + pad2(this.b.toString(16));
    }

    toString() : string {
        return `rgb(${this.r}, ${this.g}, ${this.b})`
    }

}
