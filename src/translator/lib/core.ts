interface IJssStyleBlock {
    name: string;
    value: JssStyleProp;
    children: IJssStyleBlock[];
    push(name : string, value: any) : void;
    addChild(value: IJssStyleBlock) : void;
    extend(value : object) : void;
    isEmpty() : boolean;
    toCss() : string;
    __toString() : string;
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

export interface JssStyleProp {
    [name : string] : string | number;
}

export const JssStyleBlock = (function() {
    const privateValue = new WeakMap<JssStyleBlock, JssStyleProp>();
    const privateChildren = new WeakMap<JssStyleBlock, JssStyleBlock[]>();
    const privateName = new WeakMap<JssStyleBlock, string>();
    const privateIsEmpty = new WeakMap<JssStyleBlock, boolean>();

    function sprintObject(value : any) {
        var result = "";

        for (const key in value) {
            result += `    ${key}: ${value[key]};\n`;
        }

        return result;
    }

    class JssStyleBlock implements IJssStyleBlock {
        constructor(name : string) {
            privateName.set(this, name);
            privateIsEmpty.set(this, true);
            privateChildren.set(this, []);
            privateValue.set(this, {});
        }

        get name() : string {
            return getPrivate(this, privateName);
        }

        get value() : JssStyleProp {
            return Object.assign({}, getPrivate(this, privateValue));
        }

        get children() : JssStyleBlock[] {
            return [...getPrivate(this, privateChildren)];
        }

        push(name : string, value : any) {
            getPrivate(this, privateValue)[name] = value;
            setPrivate(this, privateIsEmpty, false);
        }

        addChild(value : IJssStyleBlock) {
            if (value == this) {
                throw new Error('cannot contain itself')
            }
            getPrivate(this, privateChildren).push(value);
            setPrivate(this, privateIsEmpty, false);
        }

        extend(value : object) : void {
            Object.assign(getPrivate(this, privateValue), value);
        }

        isEmpty() : boolean {
            return getPrivate(this, privateIsEmpty);
        }

        toCss() : string {
            const name = getPrivate(this, privateName);
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

    return JssStyleBlock;
})();

export const JssStyleSheet = (function() {
    type TItem = string | IJssStyleBlock;
    let privateItems = new WeakMap<JssStyleSheet, TItem[]>();

    class JssStyleSheet {
        constructor() {
            setPrivate(this, privateItems, []);
        }

        insertBlock(block : IJssStyleBlock) {
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

        __toString() {
            return this.toCss();
        }
    }

    return JssStyleSheet;
})();
