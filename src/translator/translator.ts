import { CssBlockNode, CssSelectorNode, IgnoreNode, Node, NodeType, RawNode, SyntaxTree } from 'parser/syntaxTree';

function translateNode(node : Node) : string {
    switch(node.type) {
        case NodeType.Ignore:
            return (<IgnoreNode>node).items.join('');
        case NodeType.Raw:
            return (<RawNode>node).value;
        case NodeType.CssBlock:
            return translator((<CssBlockNode>node).selectors) + '{' + translateNode((<CssBlockNode>node).block) + '}';
        case NodeType.CssSelector:
            return (<CssSelectorNode>node).items.join(',');
        default:
            throw new Error('unsupported node');
    }
}

export function translator(tree : SyntaxTree) : string {
    const result = tree.map(translateNode);

    return result.join('');
}
