import { JssNode, NodeType, SyntaxTree } from 'parser/syntaxTree';

function quoteEscape(str : string) : string {
    return str.replace('"', '\"');
}

function wrapValue(value : string | object) : string {
    let safeValue;
    if (typeof value == 'string') {
        safeValue = quoteEscape(value);
    } else {
        safeValue = JSON.stringify(value);
    }

    return `css.push("${safeValue}");`;
}

function translateNode(node : JssNode) : string {
    switch(node.type) {
        case NodeType.Ignore:
            return node.items.join('');
        case NodeType.Raw:
            return node.value;
        case NodeType.CssBlock:
            return wrapValue({
            });
            return translatorNode(node.selectors) + '{' + translateNode(node.block) + '}';
        case NodeType.CssSelector:
            return node.items.join(',');
        case NodeType.CssImport:
            return wrapValue(node.path.trim());
        case NodeType.Comment:
        default:
            throw new Error(`unsupported node ${JSON.stringify(node)}`);
    }
}

export function translator(tree : SyntaxTree) : string {
    const result = tree.map(translateNode);

    return result.join('');
}
