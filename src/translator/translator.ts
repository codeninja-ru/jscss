import { CssDeclarationNode, CssImportNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssNode, JssSelectorNode, JssSpreadNode, JssVarDeclarationNode, NodeType, SyntaxTree } from 'parser/syntaxTree';
import { SourceNode } from 'source-map';

const EXPORT_VAR_NAME = '_styles';

function quoteEscape(str : string) : string {
    return str.replace('"', '\"').replace("`", "\`");
}

export interface GeneratedCode {
    value: string;
    sourceMap: string;
}

function cssSelectors2js(selectors : JssSelectorNode[]) : SourceNode {
    const chunks = ['`'] as (string | SourceNode)[];
    selectors.forEach((item, key) => {
        chunks.push(new SourceNode(item.position.line,
                                      item.position.col,
                                      null,
                                      item.items.map(quoteEscape).join('')
                                     ));
        if (key < selectors.length - 1) {
            chunks.push(',');
        }
    });
    chunks.push('`');
    return new SourceNode(null,
                          null,
                          null,
                          chunks);
}

type TemplateParams = (string | SourceNode)[];
function tag(strings : TemplateStringsArray, ...params : TemplateParams) : SourceNode {
    let result = [] as TemplateParams;

    for (var i = 0; i < strings.length; i++) {
        result.push(strings[i]);
        if (params[i]) {
            result.push(params[i]);
        }
    }

    return new SourceNode(null, null, null, result);
}

function cssDeclration2SourceNode(item : CssDeclarationNode) : SourceNode {
    const prop = new SourceNode(item.propPos.line,
                                item.propPos.col,
                                null,
                                quoteEscape(item.prop));
    const value = new SourceNode(item.valuePos.line,
                                 item.valuePos.col,
                                 null,
                                 quoteEscape(item.value) + item.prio ? " " + item.prio : "");
    const prio = item.prioPos ? new SourceNode(item.prioPos.line,
                                               item.prioPos.col,
                                               null,
                                               item.prio) : null;
    return tag`self.push("${prop}", "${value}${prio ? " " : ""}${prio ? prio : ""}");\n`;
}

function jssDeclaration2SourceNode(item : JssDeclarationNode) : SourceNode {
    //NOTE we do not parse content of the blocks here so an syntax error in the block can break the final code

    const prop = new SourceNode(item.propPos.line,
                                item.propPos.col,
                                null,
                                quoteEscape(item.prop));
    const value = new SourceNode(item.valuePos.line,
                                 item.valuePos.col,
                                 null,
                                 item.value);
    return tag`self.push(\`${prop}\`, \`${value}\`);\n`;
}

function jssSpread2SourceNode(item : JssSpreadNode) : SourceNode {
    const spread = new SourceNode(item.valuePos.line,
                                  item.valuePos.col,
                                  null,
                                  item.value);
    return tag`self.extend(${spread});\n`;
}

function declarations2js(blockList : JssBlockItemNode[], bindName = 'self') : SourceNode {
    const code = blockList
        .map((item) => {
            switch(item.type) {
                case NodeType.CssDeclaration:
                    return cssDeclration2SourceNode(item);
                case NodeType.JssDeclaration:
                    return jssDeclaration2SourceNode(item);
                case NodeType.Ignore:
                    return '';
                case NodeType.JssBlock:
                    return tag`self.addChild(${jssBlock2js(item, bindName)})`;
                case NodeType.JssSpread:
                    return jssSpread2SourceNode(item);
                default:
                    throw new Error(`unsupported block item ${JSON.stringify(item)}`);
            }
        });
    return new SourceNode(null,
                          null,
                          null,
                          code as SourceNode[]);
}

function jssBlock2js(node : JssBlockNode, bindName = 'self') : SourceNode {
    return tag`(function() {
var self = new JssStyleBlock(${cssSelectors2js(node.selectors)});
${declarations2js(node.items)}
return self;
}).bind(${bindName})()`;
}

function jssVarBlock2js(node : JssVarDeclarationNode, bindName = 'caller') : SourceNode {
    const keyword = new SourceNode(node.keywordPos.line,
                                   node.keywordPos.col,
                                   null,
                                   node.keyword);
    const varName = new SourceNode(node.namePos.line,
                                   node.namePos.col,
                                   null,
                                   node.name);
    return new SourceNode(null,
                          null,
                          null,
                          `${node.hasExport ? 'export ' : ''}${keyword} ${varName} = new (class extends JssBlockCaller {
call(${bindName}) {
var self = new JssBlock();
${declarations2js(node.items, bindName)}

return self;
}
})();`);
}

function insertSourceCssImport(node : CssImportNode) : SourceNode {
    return new SourceNode(
        node.position.line,
        node.position.col,
        null,
        `@import ${quoteEscape(node.path)};`);
}

function translateNode(node : JssNode) : SourceNode {
    switch(node.type) {
        case NodeType.Ignore:
            return new SourceNode();
        case NodeType.Raw:
            return new SourceNode(node.position.line,
                                  node.position.col,
                                  null, //TODO add file name
                                  node.value);
        case NodeType.JssBlock:
            return new SourceNode(null,
                                  null,
                                  null, //TODO add file name
                                  `${EXPORT_VAR_NAME}.insertBlock(${jssBlock2js(node)});\n`);
        case NodeType.JssSelector:
            return new SourceNode(node.position.line,
                                  node.position.col,
                                  null,
                                  node.items.join(','));
        case NodeType.CssImport:
            return new SourceNode(null,
                                 null,
                                 null,
                                 `${EXPORT_VAR_NAME}.insertCss("${insertSourceCssImport(node)}");\n`);
        case NodeType.JssVarDeclaration:
            return jssVarBlock2js(node);
        case NodeType.Comment:
        default:
            throw new Error(`unsupported node ${JSON.stringify(node)}`);
    }
}

export function translator(tree : SyntaxTree) : GeneratedCode {
    const result = tree.map(translateNode);
    console.log(tree);
    console.log(result);
    const source = new SourceNode(null, null, null, [
        `// this code is autogenerated, do not edit it
var ${EXPORT_VAR_NAME} = ${EXPORT_VAR_NAME} ? ${EXPORT_VAR_NAME} : new JssStylesheet();
var self = null;\n`,
        //...result,
        result[0],
        `${result.join('')}

export ${EXPORT_VAR_NAME};`
    ]);

    const {code, map} = source.toStringWithSourceMap({
        file: 'result.css', // TODO filename
    });

    return {
        value: code,
        sourceMap: map.toString(),
    };
}
