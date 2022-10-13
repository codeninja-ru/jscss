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

    describe('funcitons', () => {
            const css = evalTestCode(`
function pad2(n) { return n.length > 1 ? n : "0" + n; }
function rgb(r,g,b) { return "#" + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(b.toString(16)); }

.className {
  background: \${rgb(123,123,123)};
}`).toCss();
            expect(css).toEqual(`.className {
    background: #7b7b7b;
}`);
    });

    describe('Nesting', () => {
        it('can nest rules', () => {
            const css = evalTestCode(`.menu {
  font-size: 12px;
  \${this.name}.menu__item {
      color: 10px;
  }
}`).toCss();
            expect(css).toEqual(`.menu {
    font-size: 12px;
}

.menu.menu__item {
    color: 10px;
}`);
        });

        it('can nest list of selectors', () => {
            const css = evalTestCode(`.menu1, .menu2 {
  font-size: 12px;
  \${this.selectors[0]}.menu__item {
      color: 10px;
  }
  \${this.selectors[1]}.menu__item {
      color: 12px;
  }
}`).toCss();
            expect(css).toEqual(`.menu1, .menu2 {
    font-size: 12px;
}

.menu1.menu__item {
    color: 10px;
}

.menu2.menu__item {
    color: 12px;
}`);
        });


    });
});
