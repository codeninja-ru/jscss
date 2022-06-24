import { CssSelectorNode, JssBlockItemNode, JssBlockNode, JssNode, NodeType, SyntaxTree } from 'parser/syntaxTree';

function quoteEscape(str : string) : string {
    return str.replace('"', '\"');
}

function cssSelectors2js(selectors : CssSelectorNode[]) : string {
    return '`' + selectors.map((item) => item.items.join('')).join(',') + '`';
}

function declarations2js(blockList : JssBlockItemNode[]) : string {
    return blockList
        .map((item) => {
            switch(item.type) {
                case NodeType.CssDeclaration:
                    return `value["${quoteEscape(item.prop)}"] = "${quoteEscape(item.value) + item.prio ? " " + item.prio : ""}";\n`;
                case NodeType.JssDeclaration:
                    //NOTE we do not parse content of the blocks here so an syntax error in the block can break the final code
                    return `value["${quoteEscape(item.prop)}"] = \`${item.value}\`;\n`;
                case NodeType.Ignore:
                    return '';
                default:
                    throw new Error(`unsupported block item ${JSON.stringify(item)}`);
            }
        })
        .join('');
}

function cssBlock2js(node : JssBlockNode) : string {
    return `(function(css) {
var _subBlocks = [];
var name = ${cssSelectors2js(node.selectors)};
var value = {};
${declarations2js(node.items)}
css.push({name: name, value: value});
for(var item of _subBlocks) {
css.push(item);
}
})(css);`;
}

function translateNode(node : JssNode) : string {
    switch(node.type) {
        case NodeType.Ignore:
            return node.items.map(item => item.trim()).join('') + "\n";
        case NodeType.Raw:
            return node.value;
        case NodeType.JssBlock:
            return cssBlock2js(node);
        case NodeType.CssSelector:
            return node.items.join(',');
        case NodeType.CssImport:
            return `css.push("@import ${quoteEscape(node.path)};");\n`;
        case NodeType.Comment:
        default:
            throw new Error(`unsupported node ${JSON.stringify(node)}`);
    }
}

export function translator(tree : SyntaxTree) : string {
    const result = tree.map(translateNode);

    return `var css = [];
${result.join('')}

export default css;`;
}
