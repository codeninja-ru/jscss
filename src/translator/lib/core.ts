interface StyleArrayItem {
    name: string,
    value: StyleProp
}

type StyleArray = StyleArrayItem[];
type StyleSheetArray = (StyleArrayItem | string)[];

export interface Block {
    styles : StyleProp;
    selectors: string[],
    children: StyleBlock[];
    push(name : string, value: any) : void;
    addChild(value: StyleBlock) : void;
    extend(value : object) : void;
    isEmpty() : boolean;
}

export interface StyleBlock extends Block {
    name: string;
    toCss() : string;
    toArray() : StyleArray;
    __toString() : string;
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
    __toString() : string;
    toArray() : StyleSheetArray;
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

export interface StyleProp {
    [name : string] : StylePropValue;
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

    __toString() {
        return this.toCss();
    }
}

const privateValue = new WeakMap<Block, StyleProp>();
const privateChildren = new WeakMap<Block, StyleBlock[]>();
const privateIsEmpty = new WeakMap<Block, boolean>();

export class JssBlock implements Block {
    constructor() {
        privateIsEmpty.set(this, true);
        privateChildren.set(this, []);
        privateValue.set(this, {});
    }

    get selectors() : string[] {
        return [...getPrivate(this, privateSelectors)];
    }

    get children() : StyleBlock[] {
        return [...getPrivate(this, privateChildren)];
    }

    push(name : string, value : any) {
        getPrivate(this, privateValue)[name] = value;
        setPrivate(this, privateIsEmpty, false);
    }

    addChild(value : StyleBlock) {
        // @ts-ignore
        if (value == this) {
            throw new Error('cannot contain itself')
        }
        getPrivate(this, privateChildren).push(value);
        setPrivate(this, privateIsEmpty, false);
    }

    extend(value : StyleProp | JssBlockCaller) : void {
        if (value instanceof JssBlockCaller) {
            const blockInstance = value.call(this);
            Object.assign(getPrivate(this, privateValue), blockInstance.styles);
            blockInstance.children.forEach((child) => this.addChild(child));
        } else {
            Object.assign(getPrivate(this, privateValue), value);
        }
    }

    isEmpty() : boolean {
        return getPrivate(this, privateIsEmpty);
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
    constructor(selectors : string[]) {
        super();
        privateSelectors.set(this, selectors);
    }

    get name() : string {
        return getPrivate(this, privateSelectors).join(', ');
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

        if (this.isEmpty()) {
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

    __toString() : string {
        return this.toCss();
    }
}
