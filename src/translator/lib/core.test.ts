import { JssBlock, JssBlockCaller, JssStyleBlock, JssStyleSheet } from './core';

describe('class JssStyleSheet', () => {
    it('prints css', () => {
        const jssStyleSheet = new JssStyleSheet();
        const jssStyleSheet2 = new JssStyleSheet();
        const block = new JssStyleBlock('.className');
        jssStyleSheet.insertCss("@import 'main.css';");
        jssStyleSheet.insertBlock(block);
        jssStyleSheet.insertCss("@import 'test.css';");

        expect(jssStyleSheet.toCss()).toEqual("@import 'main.css';\n\n.className { }\n\n@import 'test.css';");
        expect(jssStyleSheet2.toCss()).toEqual("");
    });

});

describe('class JssStyleBlock', () => {
    it('prints css', () => {
        const block = new JssStyleBlock('.className');
        expect(block.isEmpty()).toBeTruthy();
        expect(block.toCss()).toEqual('.className { }')
        expect(block.name).toEqual(".className");
        expect(block.styles).toEqual({});

        block.push("color", "red");
        block.push("font-size", "10px");

        expect(block.isEmpty()).toBeFalsy();
        expect(block.styles).toEqual({ "color" : "red", "font-size" : "10px"});
        expect(block.toCss()).toEqual(`.className {
    color: red;
    font-size: 10px;
}`);
    });

    it('allows to uses an array of selectors', () => {
        const block = new JssStyleBlock(['.className1', '.className2']);
        expect(block.toCss()).toEqual('.className1,.className2 { }');
        expect(block.name).toEqual(['.className1', '.className2']);
    });


    it('cannot contain itself', () => {
        const block1 = new JssStyleBlock('.className1');
        expect(() => {
            block1.addChild(block1);
        }).toThrowError();
    });


    it('prints children blocks', () => {
        const block1 = new JssStyleBlock('.className1');
        const block2 = new JssStyleBlock('.className2');
        block2.push("color", "blue");
        expect(block1.children).toEqual([]);

        block1.addChild(block2);
        expect(block1.isEmpty()).toBeFalsy();
        expect(block1.children).toEqual([block2]);
        expect(block2.children).toEqual([]);
    });

    it('prints children blocks', () => {
        const block1 = new JssStyleBlock('.className1');
        block1.push("color", "red");
        block1.push("font-size", "10px");

        const block2 = new JssStyleBlock('.className2');
        block2.push("color", "blue");

        block1.addChild(block2);
        expect(block1.toCss()).toEqual(`.className1 {
    color: red;
    font-size: 10px;
}

.className2 {
    color: blue;
}`);

        expect(block1.toArray()).toEqual([
            {name: '.className1', value: { color: 'red', 'font-size': '10px'}},
            {name: '.className2', value: {color: 'blue'}}
        ]);
    });


    it('has styles', () => {
        const block = new JssStyleBlock('p');
        block.push("font-size", "10px");

        expect(block.styles.fontSize).toEqual("10px");
        expect(block.styles["font-size"]).toEqual("10px");
        expect(block.styles.noProp).toBeUndefined();

        expect(Object.assign({}, block.styles)).toEqual({
            "font-size": "10px",
        });
    });

    it('can be extended by prop object', () => {
        const block = new JssStyleBlock('p');
        block.push("font-size", "10px");
        block.extend({display: "block", color: 'red'});

        expect(block.styles).toEqual({
            "font-size": "10px",
            "display": "block",
            "color": "red",
        });
    });

    it('can be extended by block caller', () => {
        const block = new JssStyleBlock('p');
        block.push("font-size", "10px");
        const child2 = new JssStyleBlock('p');
        child2.push("font-size", "10px");
        const blockCaller = new (class extends JssBlockCaller {
            call() {
                const child = new JssBlock();
                child.push('display', 'block');
                child.push('color', 'red');
                child.addChild(child2)

                return child;
            }
        })();
        block.extend(blockCaller);

        expect(block.styles).toEqual({
            "font-size": "10px",
            "display": "block",
            "color": "red",
        });
        expect(block.children).toEqual([child2]);
    });

});
