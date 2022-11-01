import { JssBlock, JssBlockCaller, JssMediaQueryBlock, JssStyleBlock, JssStyleSheet } from './core';

describe('class JssStyleSheet', () => {
    it('prints css', () => {
        const jssStyleSheet = new JssStyleSheet();
        const jssStyleSheet2 = new JssStyleSheet();
        const block = new JssStyleBlock(['.className']);
        jssStyleSheet.insertCss("@import 'main.css';");
        jssStyleSheet.insertBlock(block);
        jssStyleSheet.insertCss("@import 'test.css';");

        expect(jssStyleSheet.toCss()).toEqual("@import 'main.css';\n\n.className { }\n\n@import 'test.css';");
        expect(jssStyleSheet2.toCss()).toEqual("");
    });

});

describe('class JssStyleBlock', () => {
    it('prints css', () => {
        const block = new JssStyleBlock(['.className']);
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

    it('works with the simplified constructor', () => {
        const block = new JssStyleBlock('.className', {
            "color": "red",
            "font-size": "10px"
        });

        expect(block.isEmpty()).toBeFalsy();
        expect(block.styles).toEqual({ "color" : "red", "font-size" : "10px"});
        expect(block.toCss()).toEqual(`.className {
    color: red;
    font-size: 10px;
}`);
    });


    it('allows to uses an array of selectors', () => {
        const block = new JssStyleBlock(['.className1', '.className2']);
        expect(block.toCss()).toEqual('.className1, .className2 { }');
        expect(block.name).toEqual('.className1, .className2');
        expect(block.selectors[0]).toEqual('.className1');
        expect(block.selectors[1]).toEqual('.className2');
    });


    it('cannot contain itself', () => {
        const block1 = new JssStyleBlock(['.className1']);
        expect(() => {
            block1.addChild(block1);
        }).toThrowError();
    });


    it('prints children blocks', () => {
        const block1 = new JssStyleBlock(['.className1']);
        const block2 = new JssStyleBlock(['.className2']);
        block2.push("color", "blue");
        expect(block1.children).toEqual([]);

        block1.addChild(block2);
        expect(block1.isEmpty()).toBeFalsy();
        expect(block1.children).toEqual([block2]);
        expect(block2.children).toEqual([]);
    });

    it('prints children blocks', () => {
        const block1 = new JssStyleBlock(['.className1']);
        block1.push("color", "red");
        block1.push("font-size", "10px");

        const block2 = new JssStyleBlock(['.className2']);
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
        const block = new JssStyleBlock(['p']);
        block.push("font-size", "10px");

        expect(block.styles.fontSize).toEqual("10px");
        expect(block.styles["font-size"]).toEqual("10px");
        expect(block.styles.noProp).toBeUndefined();

        expect(Object.assign({}, block.styles)).toEqual({
            "font-size": "10px",
        });
    });

    it('can be extended by prop object', () => {
        const block = new JssStyleBlock(['p']);
        block.push("font-size", "10px");
        block.extend({display: "block", color: 'red'});

        expect(block.styles).toEqual({
            "font-size": "10px",
            "display": "block",
            "color": "red",
        });
    });

    it('can be extended by sub blocks', () => {
        const block = new JssStyleBlock(['p']);
        block.push("font-size", "10px");
        const subBlock = new JssStyleBlock('className1', {
            width: '100%',
        });
        block.extend({
            display: "block",
            color: 'red',
            className1: subBlock,
        });

        expect(block.styles).toEqual({
            "font-size": "10px",
            "display": "block",
            "color": "red",
        });
        expect(block.children).toEqual([
            subBlock,
        ]);
    });


    it('can be extended by block caller', () => {
        const block = new JssStyleBlock(['p']);
        block.push("font-size", "10px");
        const child2 = new JssStyleBlock(['p']);
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

describe('MediaQueryBlock', () => {
    it('prints an empty @media', () => {
        const media = new JssMediaQueryBlock(['(min-width: 768px)']);
        expect(media.toCss()).toEqual(`@media (min-width: 768px) { }`);
        expect(media.toArray()).toEqual([
            {name: "@media (min-width: 768px)", children: []}
        ]);
    });

    it('prints css for @media { .component {} }', () => {
        const media = new JssMediaQueryBlock(['(min-width: 768px)']);
        media.addChild(new JssStyleBlock('.component', {
            'width': '600px',
        }));

        expect(media.toCss()).toEqual(`@media (min-width: 768px) {.component {
    width: 600px;
}}`);
        expect(media.toArray()).toEqual([
            {name: "@media (min-width: 768px)", children: [
                {name: '.component', value: {
                    width: '600px',
                }}
            ]}
        ]);
    });

    it('prints css for .component { @media {} }', () => {
        const block = new JssStyleBlock('.component', {
            width: '600px',
        });

        block.addChild(new JssMediaQueryBlock('screen', {
            width: '700px',
        }));

        //TODO implement idents
        expect(block.toCss()).toEqual(`.component {
    width: 600px;
}

@media screen {
.component {
    width: 700px;
}
}`);
        expect(block.toArray()).toEqual([
            {name: '.component', value: {
                width: '600px',
            }},
            {name: "@media screen", children: [
                {name: '.component', value: {
                    width: '700px',
                }}
            ]},
        ]);
    });

    it('can handle nested @media', () => {
        const block = new JssStyleBlock('.className');
        const media1 = new JssMediaQueryBlock('screen', {
            width: '100px',
        });
        const media2 = new JssMediaQueryBlock('print', {
            width: '200px',
        });
        const media3 = new JssMediaQueryBlock('(min-width: 700px)', {
            width: '300px',
        });

        block.addChild(media1);
        media1.addChild(media2);
        media2.addChild(media3);

        expect(block.toCss()).toEqual(`.className { }

@media screen {
.className {
    width: 100px;
}
@media print {
.className {
    width: 200px;
}
@media (min-width: 700px) {
.className {
    width: 300px;
}
}}}`);
        expect(block.toArray()).toEqual([
            {name: ".className", value: {}},
            {name: '@media screen', children: [
                {name: '.className', value: {width: '100px'}},
                {name: '@media print', children: [
                    {name: '.className', value: {width: '200px'}},
                    {name: '@media (min-width: 700px)', children: [
                        {name: '.className', value: {width: '300px'}},
                    ]},
                ]},
            ]}
        ]);
    });


    it('is not able to handle a @media without a parent blocks', () => {
        const media = new JssMediaQueryBlock('screen', {
            width: '100%',
        });

        expect(() => media.toCss()).toThrowError();
        expect(() => media.toArray()).toThrowError();

        media.addChild(new JssStyleBlock('.className', {
            width: '10px',
        }));

        expect(() => media.toCss()).toThrowError();
        expect(() => media.toArray()).toThrowError();
    });

    it('throws errors for incorrect usage', () => {
        const media = new JssMediaQueryBlock('screen', {
            width: '100%',
        });

        expect(() => media.toCss()).toThrowError();
        expect(() => media.toArray()).toThrowError();
    });

});
