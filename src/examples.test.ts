import { evalTestCode } from "testUtils";

describe('examples', () => {
    describe('variales', () => {
        it('use js syntax for variables', () => {
            const css = evalTestCode(`const color = '#fff';
const baseSize = 10;

.className {
  color: \${color};
  size: \${baseSize + 2}px;
}`).toCss();
            expect(css).toEqual(`.className {
    color: #fff;
    size: 12px;
}`);
        });

        it('use js syntax for variables', () => {
            const css = evalTestCode(`const size = new Px(10);

.className {
  color: #fff;
  size: \${size};
}`).toCss();
            expect(css).toEqual(`.className {
    color: #fff;
    size: 10px;
}`);
        });

    });

    describe('Mixins', () => {
        it('supports mixins', () => {
            const css = evalTestCode(`const bordered = new {
  border: 3px solid red;
  border-radius: 3px;
}

.className {
  font-size: 12px;
  ...bordered;
}`).toCss();
            expect(css).toEqual(`.className {
    font-size: 12px;
    border: 3px solid red;
    border-radius: 3px;
}`);
        });

    });
});
