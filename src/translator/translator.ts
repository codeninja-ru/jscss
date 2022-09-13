import { CssDeclarationNode, CssImportNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssNode, JssSelectorNode, JssSpreadNode, JssVarDeclarationNode, NodeType, SyntaxTree } from 'parser/syntaxTree';
import { SourceMapGenerator, SourceNode } from 'source-map';
import { Position } from 'stream/position';
import { SourceMappingUrl } from './sourceMappingUrl';

const EXPORT_VAR_NAME = '_styles';

function makeSourceNode(position : Position,
                    fileName : string,
                    chunks : Array<(string | SourceNode)> | SourceNode | string) : SourceNode {
    return new SourceNode(position.line, position.col - 1, fileName, chunks);
}

function makeNullSourceNode(chunks : Array<(string | SourceNode)> | SourceNode | string) : SourceNode {
    return new SourceNode(null, null, null, chunks);
}

function quoteEscape(str : string) : string {
    return str.replace('"', '\"').replace("`", "\`");
}

export interface GeneratedCode {
    value: string;
    sourceMap: string;
    sourceMapGen: SourceMapGenerator,
}

function cssSelectors2js(selectors : JssSelectorNode[], fileName : string) : SourceNode {
    const chunks = makeNullSourceNode('`');
    selectors.forEach((item) => {
        const selector = item.items.map(quoteEscape).join('');
        chunks.add(makeSourceNode(item.position, fileName, selector));
    });
    chunks.add('`');
    return makeNullSourceNode(chunks);
}

type TemplateParams = (string | SourceNode)[];
function tag(strings : TemplateStringsArray, ...params : TemplateParams) : SourceNode {
    let result = [] as TemplateParams;

    for (var i = 0; i < strings.length; i++) {
        result.push(strings[i]);
        if (params[i]) {
            if (typeof params[i] == 'string') {
                result.push(params[i]);
            } else {
                const node = (params[i] as SourceNode);
                if (node.line == null) {
                    node.children.forEach((item) => result.push(item));
                } else {
                    result.push(params[i]);
                }
            }
        }
    }

    return makeNullSourceNode(result);
}

function cssDeclration2SourceNode(item : CssDeclarationNode, fileName : string) : SourceNode {
    const prop = makeSourceNode(item.propPos,
                                fileName,
                                quoteEscape(item.prop));
    const value = makeSourceNode(item.valuePos,
                                 fileName,
                                 quoteEscape(item.value) + item.prio ? " " + item.prio : "");
    const prio = item.prioPos && item.prio ? makeSourceNode(item.prioPos,
                                               fileName,
                                               item.prio) : null;
    return tag`self.push("${prop}", "${value}${prio ? " " : ""}${prio ? prio : ""}");\n`;
}

function jssDeclaration2SourceNode(item : JssDeclarationNode, fileName : string) : SourceNode {
    //NOTE we do not parse content of the blocks here so an syntax error in the block can break the final code

    const prop = makeSourceNode(item.propPos,
                                fileName,
                                quoteEscape(item.prop));
    const value = makeSourceNode(item.valuePos,
                                 fileName,
                                 item.value);
    return tag`self.push(\`${prop}\`, \`${value}\`);\n`;
}

function jssSpread2SourceNode(item : JssSpreadNode, fileName : string) : SourceNode {
    const spread = makeSourceNode(item.valuePos,
                                  fileName,
                                  item.value);
    return tag`self.extend(${spread});\n`;
}

function declarations2js(blockList : JssBlockItemNode[], fileName : string, bindName = 'self') : SourceNode {
    const code = blockList
        .map((item) => {
            switch(item.type) {
                case NodeType.CssDeclaration:
                    return cssDeclration2SourceNode(item, fileName);
                case NodeType.JssDeclaration:
                    return jssDeclaration2SourceNode(item, fileName);
                case NodeType.Ignore:
                    return '';
                case NodeType.JssBlock:
                    return tag`self.addChild(${jssBlock2js(item, fileName, bindName)})`;
                case NodeType.JssSpread:
                    return jssSpread2SourceNode(item, fileName);
                default:
                    throw new Error(`unsupported block item ${JSON.stringify(item)}`);
            }
        });
    return makeNullSourceNode(code as SourceNode[]);
}

function jssBlock2js(node : JssBlockNode, fileName: string, bindName = 'self') : SourceNode {
    return tag`(function() {
var self = new JssStyleBlock(${cssSelectors2js(node.selectors, fileName)});
${declarations2js(node.items, fileName)}
return self;
}).bind(${bindName})()`;
}

function jssVarBlock2js(node : JssVarDeclarationNode, fileName : string, bindName = 'caller') : SourceNode {
    const exportSourceNode = node.hasExport && node.exportPos ? makeSourceNode(node.exportPos,
                                                             fileName,
                                                                               'export ') : null;
    const keyword = makeSourceNode(node.keywordPos,
                                   fileName,
                                   node.keyword);
    const varName = makeSourceNode(node.namePos,
                                   fileName,
                                   node.name);
    return tag`${exportSourceNode ? exportSourceNode : ''}${keyword} ${varName} = new (class extends JssBlockCaller {
call(${bindName}) {
var self = new JssBlock();
(function() {
${declarations2js(node.items, fileName, bindName)}
}).bind(${bindName})();

return self;
}
})();`;
}

function insertSourceCssImport(node : CssImportNode, fileName : string) : SourceNode {
    return makeSourceNode(
        node.position,
        fileName,
        `@import ${quoteEscape(node.path)};`);
}

function translateNode(node : JssNode, fileName : string) : SourceNode {
    switch(node.type) {
        case NodeType.Ignore:
            return new SourceNode();
        case NodeType.Raw:
            return makeSourceNode(node.position,
                                  fileName,
                                  [node.value, "\n"]);
        case NodeType.JssBlock:
            return tag`${EXPORT_VAR_NAME}.insertBlock(${jssBlock2js(node, fileName)});\n`;
        case NodeType.JssSelector:
            return makeSourceNode(node.position,
                                  fileName,
                                  node.items.join(','));
        case NodeType.CssImport:
            return makeSourceNode(node.position,
                                 fileName,
                                 tag`${EXPORT_VAR_NAME}.insertCss("${insertSourceCssImport(node, fileName)}");\n`);
        case NodeType.JssVarDeclaration:
            return jssVarBlock2js(node, fileName);
        case NodeType.Comment:
        default:
            throw new Error(`unsupported node ${JSON.stringify(node)}`);
    }
}

export function translator(tree : SyntaxTree,
                           sourceFileName :
                           string, resultFileName : string) : GeneratedCode {
    const result = tree.map((node) => translateNode(node, sourceFileName));
    const source = makeNullSourceNode([
        `// this code is autogenerated, do not edit it
var ${EXPORT_VAR_NAME} = ${EXPORT_VAR_NAME} ? ${EXPORT_VAR_NAME} : new JssStylesheet();
var self = null;\n\n`,
        //...result,
        ...result,
        `\nexport ${EXPORT_VAR_NAME};`
    ]);

    const {code, map} = source.toStringWithSourceMap({
        file: sourceFileName,
    });

    const sourceMappingUrl = new SourceMappingUrl(map);

    return {
        value: code + '\n//# sourceMappingURL=' + sourceMappingUrl.toUrl(),
        sourceMap: map.toString(),
        sourceMapGen: map,
    };
}
