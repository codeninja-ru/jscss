interface StyleArrayItem {
    name: string,
    value: StyleProp
}

interface MediaArrayItem {
    name: string,
    children: StyleArray
}

type StyleArray = (StyleArrayItem | MediaArrayItem)[];
type StyleSheetArray = (StyleArrayItem | MediaArrayItem | string)[];

export interface Block {
    styles : StyleProp;
    selectors: string[],
    children: PrintableBlock[];
    push(name : string, value: any) : void;
    addChild(value: PrintableBlock) : void;
    extend(value : object) : void;
    isEmpty() : boolean;
}

type StyleBlockParent = null | StyleBlock | MediaQueryBlock;
interface HasParent {
    readonly parent: StyleBlockParent;
}

interface PrintableBlock extends Block {
    toCss() : string;
    toArray() : StyleArray;
    toString() : string;
}

export interface StyleBlock extends Block, PrintableBlock, HasParent {
    readonly name: string;
}

export interface MediaQueryBlock extends Block, PrintableBlock, HasParent {
    readonly mediaList: string[],
}

export class JssBlockCaller {
    call(caller : Block) : Block {
        throw Error('implement me');
    }
}

export interface StyleSheet {
    insertBlock(block : StyleBlock) : void;
    insertCss(cssCode : string) : void;
    toCss() : string;
    toString() : string;
    toArray() : StyleSheetArray;
}

function isEmpty(obj : object) {
    return Object.keys(obj).length === 0;
}

function toKebabCase(propName : string) : string {
    return propName.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function getPrivate<K extends object, V>(key : K, store : WeakMap<K, V>) : V {
    const val = store.get(key);

    if (val !== undefined) {
        return val;
    } else {
        throw new Error('cound not find an instance of the private variable');
    }
}

function setPrivate<K extends object, V>(key : K, store : WeakMap<K, V>, value : V) : void {
    store.set(key, value);
}

export type StylePropValue = string | number;
export type ExtendedStylePropValue = string | number | PrintableBlock;

export interface StyleProp {
    [name : string] : StylePropValue;
}

export interface ExtendedStyleProp {
    [name : string] : ExtendedStylePropValue;
}

type TItem = string | StyleBlock;
const privateItems = new WeakMap<StyleSheet, TItem[]>();

export class JssStyleSheet implements StyleSheet {
    constructor() {
        setPrivate(this, privateItems, []);
    }

    insertBlock(block : StyleBlock) {
        getPrivate(this, privateItems).push(block);
    }

    insertCss(cssCode : string) {
        getPrivate(this, privateItems).push(cssCode);
    }

    toCss() : string {
        return getPrivate(this, privateItems)
            .map((item) => {
                if (typeof item == 'string') {
                    return item;
                } else {
                    return item.toCss();
                }
            }).join("\n\n");
    }

    toArray() : StyleSheetArray {
        const items = getPrivate(this, privateItems)
        const result = [] as StyleSheetArray;

        for (const item of items) {
            if (typeof item == 'string') {
                result.push(item);
            } else {
                result.push(...item.toArray());
            }
        }

        return result;
    }

    toString() {
        return this.toCss();
    }
}

const privateValue = new WeakMap<Block, StyleProp>();
const privateChildren = new WeakMap<Block, PrintableBlock[]>();
const privateParent = new WeakMap<Block, StyleBlockParent>();

function isPrintableBlock(value : any) : value is PrintableBlock {
    return value instanceof JssMediaQueryBlock || value instanceof JssStyleBlock;
}

export class JssBlock implements Block {
    constructor() {
        privateChildren.set(this, []);
        privateValue.set(this, {});
    }

    get selectors() : string[] {
        return [...getPrivate(this, privateSelectors)];
    }

    get children() : PrintableBlock[] {
        return [...getPrivate(this, privateChildren)];
    }

    push(name : string, value : any) {
        getPrivate(this, privateValue)[name] = value;
    }

    addChild(value : PrintableBlock) {
        // @ts-ignore
        if (value == this) {
            throw new Error('cannot contain itself')
        }
        getPrivate(this, privateChildren).push(value);
    }

    //TODO parse syntax like this .extend({'.className': new JssStyleBlock(...)})
    extend(value : ExtendedStyleProp | JssBlockCaller) : void {
        if (value instanceof JssBlockCaller) {
            const blockInstance = value.call(this);
            Object.assign(getPrivate(this, privateValue), blockInstance.styles);
            blockInstance.children.forEach((child) => this.addChild(child));
        } else if (!isEmpty(value)) {
            const styleProps = {} as StyleProp;
            for (const key in value) {
                const item = value[key];
                if (isPrintableBlock(item)) {
                    this.addChild(item);
                } else {
                    styleProps[key] = item;
                }

            }
            Object.assign(getPrivate(this, privateValue), styleProps);
        }
    }

    isEmpty() : boolean {
        return isEmpty(getPrivate(this, privateValue)) && isEmpty(getPrivate(this, privateChildren));
    }

    get styles() : StyleProp {
        return new Proxy(getPrivate(this, privateValue), {
            get(value : StyleProp, prop : string) : StylePropValue | undefined {
                if (typeof prop != 'string') {
                    return undefined;
                }
                if (value[prop] !== undefined) {
                    return value[prop];
                }

                const kebabProp = toKebabCase(prop);

                if (value[kebabProp] !== undefined) {
                    return value[kebabProp];
                }

                return undefined;
            }
        });
    }
}

const privateSelectors = new WeakMap<Block, string[]>();

function sprintObject(value : any) {
    var result = "";

    for (const key in value) {
        result += `    ${key}: ${value[key]};\n`;
    }

    return result;
}

export class JssStyleBlock extends JssBlock implements StyleBlock {
    constructor(selectors : string[] | string, content : (StyleProp | JssBlockCaller) = {}) {
        super();
        if (typeof selectors == 'string') {
            privateSelectors.set(this, [selectors]);
        } else {
            privateSelectors.set(this, selectors);
        }
        this.extend(content);
    }

    get name() : string {
        return getPrivate(this, privateSelectors).join(', ');
    }

    get parent() : StyleBlockParent {
        return getPrivate(this, privateParent);
    }

    addChild(value : PrintableBlock) {
        super.addChild(value);
        setPrivate(value, privateParent, this);
    }

    toArray() : StyleArray {
        const name = this.name;
        const children = getPrivate(this, privateChildren);
        const value = getPrivate(this, privateValue);
        const result = [];

        result.push({name: name, value: Object.assign({}, value)});

        if (children.length > 0) {
            for (const child of children) {
                result.push(...child.toArray());
            }
        }

        return result;
    }

    toCss() : string {
        const name = this.name;
        const children = getPrivate(this, privateChildren);
        const value = getPrivate(this, privateValue);
        const result = [] as string[];

        if (isEmpty(value)) {
            result.push(`${name} { }`);
        } else {
            result.push(`${name} {\n${sprintObject(value)}}`);
        }

        if (children.length > 0) {
            for (const child of children) {
                result.push(child.toCss());
            }
        }

        return result.join("\n\n");
    }

    toString() : string {
        return this.toCss();
    }
}

function isStyleBlock(value : any) : value is StyleBlock {
    return value !== null && value.toCss && (value as StyleBlock).name !== undefined;
}

function findStyleParent(value : StyleBlock | MediaQueryBlock) : StyleBlock | null {
    let result = value.parent;

    while(result !== null) {
        if (isStyleBlock(result)) {
            return result;
        }
        result = result.parent;
    }

    return null;
}

export class JssMediaQueryBlock extends JssBlock implements MediaQueryBlock {
    readonly mediaList: string[];
    constructor(mediaList : string[] | string, content : (StyleProp | JssBlockCaller) = {}) {
        super();
        if (typeof mediaList == 'string') {
            this.mediaList = [mediaList];
        } else {
            this.mediaList = mediaList;
        }
        this.extend(content);
        Object.defineProperty(this, 'mediaList', {
            writable: false,
        })
    }

    get parent() : StyleBlockParent {
        return getPrivate(this, privateParent);
    }

    toArray() : StyleArray {
        const name = ['@media', this.mediaList.join(', ')].filter((item) => item).join(' ');
        const children = getPrivate(this, privateChildren);
        const value = getPrivate(this, privateValue);
        const result = [] as StyleArray;

        if (isEmpty(value)) {
            result.push({
                name: name,
                children: children.map(item => item.toArray()).flat(),
            });
        } else {
            const parent = findStyleParent(this);

            if (parent != null) {
                result.push({
                    name: name,
                    children: [{
                        name: parent.name,
                        value: {...value},
                    }, ...children.map(item => item.toArray()).flat()]
                });

            } else {
                throw new Error(`@media has inner values and doesn't have a parent class`);
            }

        }

        return result;
    }

    addChild(value : PrintableBlock) {
        super.addChild(value);
        setPrivate(value, privateParent, this);
    }

    toCss() : string {
        const children = getPrivate(this, privateChildren);
        const value = getPrivate(this, privateValue);
        const result = [] as string[];

        if (this.isEmpty()) {
            result.push(`@media ${this.mediaList} { }`);
        } else {
            if (isEmpty(value)) {
                result.push(`@media ${this.mediaList} {${children.map(item => item.toCss().trimRight())}}`);
            } else {
                const parent = findStyleParent(this);
                if (parent == null) {
                    throw new Error(`@media has inner values and doesn't have a parent class`);
                } else {
                    const innerValues = sprintObject(value);
                    const childrenString = children.map(item => item.toCss().trimRight()).join('\n');

                    result.push(`@media ${this.mediaList} {\n${parent.name} {\n${innerValues}}\n${childrenString}}`);
                }
            }
        }

        return result.join("\n\n");
    }

    toString() : string {
        return this.toCss();
    }
}
