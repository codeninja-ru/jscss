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
const color = new HexColor('#fff');

.className {
  color: \${color};
  size: \${size};
}`).toCss();
            expect(css).toEqual(`.className {
    color: #fff;
    size: 10px;
}`);
        });

        it("You can put variables into style blocks. They'll be scoped inside the block.", () => {
            const css = evalTestCode(`.className {
  const size = new Px(10);
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
      font-size: \${this.parent.styles.fontSize};
  }
}`).toCss();
            expect(css).toEqual(`.menu {
    font-size: 12px;
}

.menu.menu__item {
    color: 10px;
    font-size: 12px;
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

    describe('Media-Queries', () => {
        it('can put media-queries insede the blocks', () => {
            const css = evalTestCode(`.component {
  width: 300px;
  @media (min-width: 768px) {
    width: 600px;
    @media (min-resolution: 192dpi) {
      background-image: url(/img/retina2x.png);
    }
  }
  @media (min-width: 1280px) {
    width: 800px;
  }
}`).toCss();
            expect(css).toEqual(`.component {
    width: 300px;
}

@media (min-width: 768px) {
    .component {
        width: 600px;
    }

    @media (min-resolution: 192dpi) {
        .component {
            background-image: url(/img/retina2x.png);
        }
    }
}

@media (min-width: 1280px) {
    .component {
        width: 800px;
    }
}`);

        });

    });
});
