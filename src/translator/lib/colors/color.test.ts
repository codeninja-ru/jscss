import { HexColor } from "./color";

describe('class HexColor', () => {
    it('holds color', () => {
        const color = new HexColor('#fff');
        expect(color.toHexString()).toEqual('#fff');
        expect(color.toString()).toEqual('#fff');
        expect(() => HexColor.fromString('no')).toThrowError();
    });

});
