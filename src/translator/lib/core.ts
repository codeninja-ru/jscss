interface JssStyleArrayItem {
    name: JssSelectorName,
    value: JssStyleProp
}

type JssStyleArray = JssStyleArrayItem[];
type JssStyleSheetArray = (JssStyleArrayItem | string)[];
type JssSelectorName = string[] | string;

export interface JssBlock {
    styles : JssStyleProp;
    children: JssStyleBlock[];
    push(name : string, value: any) : void;
    addChild(value: JssStyleBlock) : void;
    extend(value : object) : void;
    isEmpty() : boolean;
}

export interface JssStyleBlock extends JssBlock {
    name: JssSelectorName;
    toCss() : string;
    toArray() : JssStyleArray;
    __toString() : string;
}

export class JssBlockCaller {
    call(caller : JssBlock) : JssBlock {
        throw Error('implement me');
    }
}

export interface JssStyleSheet {
    insertBlock(block : JssStyleBlock) : void;
    insertCss(cssCode : string) : void;
    toCss() : string;
    __toString() : string;
    toArray() : JssStyleSheetArray;
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

export type JssStylePropValue = string | number;

export interface JssStyleProp {
    [name : string] : JssStylePropValue;
}

export const JssStyleSheet = (function() {
    type TItem = string | JssStyleBlock;
    let privateItems = new WeakMap<JssStyleSheet, TItem[]>();

    class JssStyleSheet implements JssStyleSheet {
        constructor() {
            setPrivate(this, privateItems, []);
        }

        insertBlock(block : JssStyleBlock) {
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

        toArray() : JssStyleSheetArray {
            const items = getPrivate(this, privateItems)
            const result = [] as JssStyleSheetArray;

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

    return JssStyleSheet;
})();

export const JssBlock = (function() {
    const privateValue = new WeakMap<JssBlock, JssStyleProp>();
    const privateChildren = new WeakMap<JssBlock, JssStyleBlock[]>();
    const privateIsEmpty = new WeakMap<JssBlock, boolean>();

    class JssBlock implements JssBlock {
        constructor() {
            privateIsEmpty.set(this, true);
            privateChildren.set(this, []);
            privateValue.set(this, {});
        }

        get children() : JssStyleBlock[] {
            return [...getPrivate(this, privateChildren)];
        }

        push(name : string, value : any) {
            getPrivate(this, privateValue)[name] = value;
            setPrivate(this, privateIsEmpty, false);
        }

        addChild(value : JssStyleBlock) {
            // @ts-ignore
            if (value == this) {
                throw new Error('cannot contain itself')
            }
            getPrivate(this, privateChildren).push(value);
            setPrivate(this, privateIsEmpty, false);
        }

        extend(value : JssStyleProp | JssBlockCaller) : void {
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

        get styles() : JssStyleProp {
            return new Proxy(getPrivate(this, privateValue), {
                get(value : JssStyleProp, prop : string) : JssStylePropValue | undefined {
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

    return JssBlock;
})();

export const JssStyleBlock = (function() {
    const privateName = new WeakMap<JssStyleBlock, JssSelectorName>();

    function sprintObject(value : any) {
        var result = "";

        for (const key in value) {
            result += `    ${key}: ${value[key]};\n`;
        }

        return result;
    }

    class JssStyleBlock extends JssBlock implements JssStyleBlock {
        constructor(name : JssSelectorName) {
            super();
            privateName.set(this, name);
        }

        get name() : JssSelectorName {
            return getPrivate(this, privateName);
        }

        toArray() : JssStyleArray {
            const name = getPrivate(this, privateName);
            // TODO it might be a bit faster if getPrivate is used since the getter makes a copy of object
            const children = this.children;
            const value = this.styles;
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
            const name = getPrivate(this, privateName);
            const children = this.children;
            const value = this.styles;
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

    return JssStyleBlock;
})();
