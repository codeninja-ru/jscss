function isStyleArrayItem(value : any) : value is StyleArrayItem {
    return value && value.name && value.value;
}

interface StyleArrayItem {
    name: string,
    value: StyleProp
}

function isMediaArrayItem(value : any) : value is MediaArrayItem {
    return value && value.name && value.children;
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

export function isJssStyleSheet(obj : any) : obj is StyleSheet {
    return typeof obj == 'object' && obj.insertBlock
        && obj.insertCss
        && obj.insertStyleSheet
        && obj.toCss
        && obj.toArray;
}

export interface StyleSheet {
    // TODO consider to combine insert* method to the single method
    insertBlock(block : StyleBlock) : void;
    insertCss(cssCode : string) : void;
    insertStyleSheet(value : StyleSheet) : void;
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

type TItem = string | StyleBlock | StyleSheet;

export class JssStyleSheet implements StyleSheet {
    _items : TItem[] = [];

    insertBlock(block : StyleBlock) {
        this._items.push(block);
    }

    insertCss(cssCode : string) {
        this._items.push(cssCode);
    }

    insertStyleSheet(block : StyleSheet) {
        this._items.push(block);
    }

    toCss() : string {
        var result = [] as string[];
        for (var i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            var prev;

            if (typeof item == 'string') {
                if (!(typeof prev == 'string' || i == 0)) {
                    result.push('');
                }
                result.push(item);
            } else {
                if (i > 0) {
                    result.push('');
                }
                result.push(item.toCss());
            }

            prev = item;
        }

        return result.join('\n');
    }

    toArray() : StyleSheetArray {
        const result = [] as StyleSheetArray;

        for (const item of this._items) {
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

const privateParent = new WeakMap<Block, StyleBlockParent>();

function isPrintableBlock(value : any) : value is PrintableBlock {
    return value instanceof JssMediaQueryBlock || value instanceof JssStyleBlock;
}

export class JssBlock implements Block {
    _value = new Map();
    _children : PrintableBlock[] = [];
    _selectors : string[] = [];

    get selectors() : string[] {
        return [...this._selectors];
    }

    get children() : PrintableBlock[] {
        return [...this._children];
    }

    push(name : string, value : any) {
        this._value.set(name, value);
    }

    addChild(value : PrintableBlock) {
        // @ts-ignore
        if (value == this) {
            throw new Error('cannot contain itself')
        }
        this._children.push(value);
    }

    extend(value : ExtendedStyleProp | JssBlockCaller) : void {
        if (value instanceof JssBlockCaller) {
            const blockInstance = value.call(this);
            for (const key in blockInstance.styles) {
                this._value.set(key, blockInstance.styles[key]);
            }
            blockInstance.children.forEach((child) => this.addChild(child));
        } else if (!isEmpty(value)) {
            for (const key in value) {
                const item = value[key];
                if (isPrintableBlock(item)) {
                    this.addChild(item);
                } else {
                    this._value.set(key, item);
                }

            }
        }
    }

    isEmpty() : boolean {
        return this._value.size == 0 && this._children.length == 0;
    }

    get styles() : StyleProp {
        return new Proxy(Object.fromEntries(this._value), {
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

function sprintObject(value : any, indent = 1) {
    var result = "";

    const spaces = indentString(indent);
    for (const key in value) {
        result += `${spaces}${key}: ${value[key]};\n`;
    }

    return result;
}

const INDENT_SPACES = '    ';
function indentString(num = 1) : string {
    let result = '';

    for (var i = 0; i < num; i++) {
        result += INDENT_SPACES;
    }

    return result;
}

function sprintCssValue(name : string, value : StyleProp, indent = 0) : string {
    if (isEmpty(value)) {
        return `${indentString(indent)}${name} { }`;
    } else {
        return `${indentString(indent)}${name} {\n${sprintObject(value, indent + 1)}${indentString(indent)}}`;
    }
}

function sprintMediaValue(name : string, children : StyleArray, indent = 0) : string {
    function print(value : StyleArrayItem | MediaArrayItem) {
        if (isStyleArrayItem(value)) {
            return sprintCssValue(value.name, value.value, indent + 1);
        } else {
            return sprintMediaValue(value.name, value.children, indent + 1);
        }
    }
    if (isEmpty(children)) {
        return `${indentString(indent)}${name} { }`;
    } else {
        return `${indentString(indent)}${name} {\n${children.map(print).join('\n\n')}\n${indentString(indent)}}`;
    }
}

export class JssStyleBlock extends JssBlock implements StyleBlock {
    constructor(selectors : string[] | string,
                content : (StyleProp | JssBlockCaller) = {},
                parent : StyleBlockParent = null) {
        super();
        if (typeof selectors == 'string') {
            this._selectors = [selectors];
        } else {
            this._selectors = selectors;
        }
        this.extend(content);
        setPrivate(this, privateParent, parent);
    }

    get name() : string {
        return this._selectors.join(', ');
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
        const value = Object.fromEntries(this._value);
        const result = [];

        result.push({name: name, value: Object.assign({}, value)});

        if (this._children.length > 0) {
            for (const child of this._children) {
                result.push(...child.toArray());
            }
        }

        return result;
    }

    toCss() : string {
        const name = this.name;
        const value = Object.fromEntries(this._value);
        const result = [] as string[];

        result.push(sprintCssValue(name, value));

        if (this._children.length > 0) {
            for (var i = 0; i < this._children.length; i++) {
                const child = this._children[i];
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

export class JssAtRuleBlock extends JssBlock implements MediaQueryBlock {
    readonly mediaList: string[];
    constructor(private blockName: string,
                mediaList : string[] | string,
                content : (StyleProp | JssBlockCaller) = {},
                parent : StyleBlockParent = null) {
        super();
        if (typeof mediaList == 'string') {
            this.mediaList = [mediaList];
        } else {
            this.mediaList = mediaList;
        }
        this.extend(content);
        Object.defineProperty(this, 'mediaList', {
            writable: false,
        });
        Object.defineProperty(this, 'blockName', {
            writable: false,
        });
        setPrivate(this, privateParent, parent);
    }

    get parent() : StyleBlockParent {
        return getPrivate(this, privateParent);
    }

    toArray() : StyleArray {
        const name = [this.blockName, this.mediaList.join(', ')].filter((item) => item).join(' ');
        const result = [] as StyleArray;

        if (this._value.size == 0) {
            result.push({
                name: name,
                children: this._children.map(item => item.toArray()).flat(),
            });
        } else {
            const value = Object.fromEntries(this._value);
            const parent = findStyleParent(this);

            if (parent != null) {
                result.push({
                    name: name,
                    children: [{
                        name: parent.name,
                        value: value,
                    }, ...this._children.map(item => item.toArray()).flat()]
                });

            } else {
                throw new Error(`${this.blockName} has inner values and doesn't have a parent class`);
            }

        }

        return result;
    }

    addChild(value : PrintableBlock) {
        super.addChild(value);
        setPrivate(value, privateParent, this);
    }

    toCss() : string {
        const values = this.toArray();
        const result = values.map((item) => {
            if (isStyleArrayItem(item)) {
                return sprintCssValue(item.name, item.value);
            } else if (isMediaArrayItem(item)) {
                return sprintMediaValue(item.name, item.children);
            } else {
                throw new Error(`unsupported ArrayItem type ${item}`)
            }
        })

        return result.join("\n\n");
    }

    toString() : string {
        return this.toCss();
    }
}

export class JssMediaQueryBlock extends JssAtRuleBlock {
    constructor(mediaList : string[] | string,
                content : (StyleProp | JssBlockCaller) = {},
                parent : StyleBlockParent = null) {
        super('@media', mediaList, content, parent);
    }
}

export class JssSupportsBlock extends JssAtRuleBlock {
    constructor(query : string,
                content : (StyleProp | JssBlockCaller) = {},
                parent : StyleBlockParent = null) {
        super('@supports', query, content, parent);
    }

    get query() : string {
        return this.mediaList[0];
    }
}
