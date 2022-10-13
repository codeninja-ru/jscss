import { Em, Percent, Px } from './dimention';

describe('Px', () => {
    it('represents pixels', () => {
        const px1 = new Px(10);
        expect(px1.toString()).toEqual('10px');
        expect(px1.value).toEqual(10);
        expect(px1.suffix).toEqual('px');
        expect(px1.add(5).toString()).toEqual('15px');
        expect(px1.add(new Px(5)).toString()).toEqual('15px');
        expect(px1.minus(5).toString()).toEqual('5px');
        expect(px1.minus(new Px(5)).toString()).toEqual('5px');
        expect(px1.equal(px1)).toBeTruthy();
        expect(px1.equal(new Px(10))).toBeTruthy();
        expect(px1.equal(new Px(9))).toBeFalsy();
        expect(px1.equal(new Em(10))).toBeFalsy();

        // @ts-ignore
        expect(() => px1.minus(new Em(5)).toString()).toThrowError();
    });
});

describe('Em', () => {
    it('represents em-s', () => {
        const em1 = new Em(10);
        expect(em1.toString()).toEqual('10em');
    });
});

describe('Percent', () => {
    it('represents em-s', () => {
        const em1 = new Percent(10);
        expect(em1.toString()).toEqual('10%');
    });
});
