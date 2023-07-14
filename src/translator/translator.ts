import { ExportSpecifier, NamedExports } from 'parser/exportsNodes';
import { ValueWithPosition } from 'parser/parserUtils';
import { isLiteralToken } from 'parser/predicats';
import { CssDeclarationNode, CssImportNode, CssRawNode, ExportDeclarationNode, FontFaceNode, ImportDeclarationNode, ImportSepcifier, JssAtRuleNode, JssBlockItemNode, JssBlockNode, JssDeclarationNode, JssNode, JssPageNode, JssSelectorNode, JssSpreadNode, JssSupportsNode, JssVarDeclarationNode, NodeType, SyntaxTree } from 'parser/syntaxTree';
import { SourceMapGenerator, SourceNode } from 'source-map';
import { Position } from 'stream/position';
import { LiteralToken } from 'token';
import { SourceMappingUrl } from './sourceMappingUrl';

const STYLES_VAR_NAME = '_styles';
const EXPORT_VAR_NAME = 'styles';

function makeSourceNode(position : Position,
                    fileName : string,
                    chunks : Array<(string | SourceNode)> | SourceNode | string) : SourceNode {
    return new SourceNode(position.line, position.col - 1, fileName, chunks);
}

function makeNullSourceNode(chunks : Array<(string | SourceNode)> | SourceNode | string) : SourceNode {
    return new SourceNode(null, null, null, chunks);
}

function quoteEscape(str : string) : string {
    return str.replaceAll('"', '\"').replaceAll("`", "\\`").replaceAll("\\", "\\\\");
}

function templateEscape(str : string) : string {
    return str.replaceAll("`", "\\`").replaceAll("\\", "\\\\");
}

export interface GeneratedCode {
    readonly value: string;
    readonly sourceMap: string;
    readonly sourceMapGen: SourceMapGenerator;
}

export class SourceNodeGenereatedCode implements GeneratedCode {
    private code : string;
    private map : SourceMapGenerator;
    private sourceMappingUrl : SourceMappingUrl;

    constructor(sourceNode : SourceNode,
                sourceFileName : string) {

        const {code, map} = sourceNode.toStringWithSourceMap({
            file: sourceFileName,
        });
        this.code = code;
        this.map = map;

        this.sourceMappingUrl = new SourceMappingUrl(map);
    }

    get value() : string {
        return this.code
            + '\n' + STYLES_VAR_NAME + ';'
            + '\n//# sourceMappingURL='
            + this.sourceMappingUrl.toUrl();
    }

    get sourceMap() : string {
        return this.map.toString();
    }

    get sourceMapGen() : SourceMapGenerator {
        return this.map;
    }
}

function cssSelectors2js(selectors : JssSelectorNode[], fileName : string) : SourceNode {
    const chunks = makeNullSourceNode('[');
    chunks.add(selectors.map((item) => {
        const selector = item.items.map(templateEscape).join(' ');
        return tag`\`${makeSourceNode(item.position, fileName, selector)}\``;
    }).join(','));
    chunks.add(']');
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
                                templateEscape(item.prop));
    const value = makeSourceNode(item.valuePos,
                                 fileName,
                                 templateEscape(item.value));
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
                    return tag`self.addChild(${jssBlock2js(item, fileName, bindName)});`;
                case NodeType.JssSpread:
                    return jssSpread2SourceNode(item, fileName);
                case NodeType.Raw:
                    return makeSourceNode(item.position,
                                          fileName,
                                          [item.value, "\n"]);
                case NodeType.JssVarDeclaration:
                    return jssVarBlock2js(item, fileName);
                case NodeType.JssAtRule:
                    return tag`self.addChild(${mediaQuery2js(item, fileName, bindName)});\n`;
                case NodeType.JssSupports:
                    return tag`self.addChild(${supports2js(item, fileName, bindName)});\n`;
                default:
                    throw new Error(`unsupported block item ${JSON.stringify(item)}`);
            }
        });
    return makeNullSourceNode(code as SourceNode[]);
}

function jssBlock2js(node : JssBlockNode, fileName: string, bindName = 'self') : SourceNode {
    return tag`(function(parent) {
var self = new JssStyleBlock(${cssSelectors2js(node.selectors, fileName)}, {}, parent);
${printProperties(node.items, fileName, bindName)}
return self;
}).bind(${bindName})(${bindName})`;
}

function fontFace2js(node : FontFaceNode, fileName: string, bindName = 'self') : SourceNode {
    return tag`(function(parent) {
var self = new JssStyleBlock(['@font-face'], {}, parent);
${printProperties(node.items, fileName, bindName)}
return self;
}).bind(${bindName})(${bindName})`;
}

function jssVarBlock2js(node : JssVarDeclarationNode, fileName : string, bindName = 'caller') : SourceNode {
    const exportSourceNode = node.hasExport && node.exportPos
        ? makeSourceNode(node.exportPos,
                         fileName,
                         `\nexports.${node.name} = ${node.name};`) : null;
    const keyword = makeSourceNode(node.keywordPos,
                                   fileName,
                                   node.keyword);
    const varName = makeSourceNode(node.namePos,
                                   fileName,
                                   node.name);
    return tag`${keyword} ${varName} = new (class extends JssBlockCaller {
call(${bindName}) {
var self = new JssBlock();
(function() {
${declarations2js(node.items, fileName, bindName)}
}).bind(${bindName})();

return self;
}
})();${exportSourceNode ? exportSourceNode : ''}\n`;
}

function insertSourceCssImport(node : CssImportNode, fileName : string) : SourceNode {
    return makeSourceNode(
        node.position,
        fileName,
        `@import ${quoteEscape(node.path)};`);
}

function insertSourceCssRaw(node : CssRawNode, fileName : string) : SourceNode {
    return makeSourceNode(
        node.position,
        fileName,
        templateEscape(node.value),
    );
}

function supports2js(node : JssSupportsNode,
                     fileName : string,
                     bindName = 'self') : SourceNode {
    const query = makeSourceNode(node.position,
                                 fileName,
                                 "`" + templateEscape(node.query.trim()) + "`");

    return tag`(function(parent) {
var self = new JssSupportsBlock(${query}, {}, parent);
${printProperties(node.items, fileName, bindName)}
return self;
}).bind(${bindName})(${bindName})`;
}

function page2js(node : JssPageNode,
                 fileName : string,
                 bindName = 'self') : SourceNode {

    const pageName = makeSourceNode(node.position, fileName, '@page');
    const params = node
        .pageSelectors
        .map(item => quoteEscape(item))
        .join(', ');
    return tag`(function(parent) {
var ${bindName} = new JssStyleBlock('${pageName}${params ? ' ' + params : ''}');
${printProperties(node.items, fileName, bindName)}
return ${bindName};
}).bind(${bindName})(${bindName})`;
}

function mediaQuery2js(node : JssAtRuleNode,
                       fileName : string,
                       bindName = 'self') : SourceNode {
    let mediaList = makeSourceNode(node.position, fileName, '[');
    mediaList.add(node.mediaList.map((item) => {
        return "`" + templateEscape(item) + "`";
    }).join(','));
    mediaList.add(']');

    const instance = node.name == '@media' ?
        tag`var self = new JssMediaQueryBlock(${mediaList}, {}, parent);`
        : tag`var self = new JssAtRuleBlock('${quoteEscape(node.name)}', ${mediaList}, {}, parent);`

    return tag`(function(parent) {
${instance}
${node.items ? printProperties(node.items, fileName, bindName) : ''}
return self;
}).bind(${bindName})(${bindName})`;
}

function printProperties(items : JssBlockItemNode[],
                         fileName : string,
                         bindName : string) : SourceNode {
    return tag`
(function(){
${declarations2js(items, fileName)}
}).bind(${bindName})();`;
}

function makeValue(value : ValueWithPosition<string>,
                   fileName : string) : SourceNode {
    return makeSourceNode(value.position, fileName, value.value);
}
function importSpecifier2jsonPair(node : ImportSepcifier,
                                  fileName : string) : SourceNode {
    if (node.moduleExportName) {
        return tag`${makeValue(node.name, fileName)}:${makeValue(node.moduleExportName, fileName)}`;
    } else {
        return makeValue(node.name, fileName);
    }
}

function node2escapedSourceNode(node : LiteralToken,
                               fileName : string) : SourceNode {
    return makeSourceNode(node.position, fileName, quoteEscape(node.value));
}

function exportSpecifiers2js(nodes : ExportSpecifier[],
                            fileName : string) : SourceNode {
    const result = makeNullSourceNode('{');

    const items = nodes.map((item) => {
        if (item.asName) {
            return tag`'${node2escapedSourceNode(item.name, fileName)}':'${node2escapedSourceNode(item.asName, fileName)}'`;
        } else {
            return tag`'${node2escapedSourceNode(item.name, fileName)}':'${node2escapedSourceNode(item.name, fileName)}'`;
        }
    });

    result.add(makeNullSourceNode(items).join(', '));

    result.add('}');

    return result;
}

function exportSpecifiers2jsGetters(nodes : ExportSpecifier[],
                                    fileName : string) : SourceNode {

    const result = makeNullSourceNode('{');

    const items = nodes.map((item) => {
        if (item.asName) {
            return tag`'${node2escapedSourceNode(item.asName, fileName)}':function() { return ${node2escapedSourceNode(item.name, fileName)}; }`;
        } else {
            return tag`'${node2escapedSourceNode(item.name, fileName)}':function() { return ${node2escapedSourceNode(item.name, fileName)}; }`;
        }
    });

    result.add(makeNullSourceNode(items).join(', '));

    result.add('}');

    return result;
}

function esExport2Js(node : ExportDeclarationNode,
                     fileName : string) : SourceNode {
    const value = node.value;
    switch(value.type) {
        case NodeType.ExportFromClause:
            const path = makeSourceNode(value.path.position,
                                        fileName,
                                        value.path.value);
            if (value.clause == '*') {
                return tag`_export_star(exports, require(${path}));\n`
            } else if (value.clause instanceof NamedExports) {
                return tag`_export_named_export(exports, ${exportSpecifiers2js(value.clause.value, fileName)}, require(${path}));\n`;
            } else if (isLiteralToken(value.clause)) {
                return tag`_export_named_export(exports, ${exportSpecifiers2js([new ExportSpecifier(value.clause)], fileName)}, require(${path}));\n`;
            } else {
                throw new Error(`unsported expertClause ${value}`);
            }
        case NodeType.NamedExports:
            return tag`_export(exports, ${exportSpecifiers2jsGetters(value.value, fileName)});\n`;
        case NodeType.VarStatement:
            const varNames = value
                    .items
                    .map((item) => new ExportSpecifier(item.name));
            return tag`${value.rawValue ? value.rawValue : ''}\n_export(exports, ${exportSpecifiers2jsGetters(varNames, fileName)});\n`;
        default:
            throw new Error(`export declaration number ${node.type} is not supported`);
    }
}

function esImport2Js(node : ImportDeclarationNode,
                     fileName : string) : SourceNode {
    const path = makeSourceNode(node.pathPos, fileName, node.path);
    if (node.vars.length == 0) {
        return tag`(function() {
    var _r = require(${path});
    if (_r && isJssStyleSheet(_r.${EXPORT_VAR_NAME})) {
        ${STYLES_VAR_NAME}.insertStyleSheet(_r.${EXPORT_VAR_NAME});
    } else if (typeof _r == 'string') {
        ${STYLES_VAR_NAME}.insertCss(_r);
    }
})();\n`;
    }

    const globalImports = node.vars
        .filter(item => item.name.value == '*')
        .map(item => {
            if (item.moduleExportName == undefined) {
                throw new Error(`moduleExportName cannot be undefined node: ${node}`);
            }
            return tag`const ${makeValue(item.moduleExportName, fileName)} = require(${path});\n`;
        });
    const namedImports = node.vars
        .filter(item => item.name.value !== '*')
        .map(item => importSpecifier2jsonPair(item, fileName));

    const result = makeNullSourceNode('')
        .add(globalImports);

    if (namedImports.length > 0) {
        result.add('const {');
        result.add(makeNullSourceNode(namedImports).join(', '));
        result.add(tag`} = require(${path});\n`);
    }

    return result;

}

function translateNode(node : JssNode,
                       fileName : string) : SourceNode {
    switch(node.type) {
        case NodeType.Ignore:
            return new SourceNode();
        case NodeType.Raw:
            return makeSourceNode(node.position,
                                  fileName,
                                  [node.value, "\n"]);
        case NodeType.JssBlock:
            return tag`${STYLES_VAR_NAME}.insertBlock(${jssBlock2js(node, fileName)});\n`;
        case NodeType.CssFontFace:
            return tag`${STYLES_VAR_NAME}.insertBlock(${fontFace2js(node, fileName)});\n`;
        case NodeType.JssSelector:
            return makeSourceNode(node.position,
                                  fileName,
                                  node.items.join(','));
        case NodeType.CssRaw:
            return makeSourceNode(node.position,
                                 fileName,
                                 tag`${STYLES_VAR_NAME}.insertCss(\`${insertSourceCssRaw(node, fileName)}\`);\n`);
        case NodeType.CssImport:
            return makeSourceNode(node.position,
                                 fileName,
                                 tag`${STYLES_VAR_NAME}.insertCss(\`${insertSourceCssImport(node, fileName)}\`);\n`);
        case NodeType.JssVarDeclaration:
            return jssVarBlock2js(node, fileName);
        case NodeType.JssAtRule:
            return tag`${STYLES_VAR_NAME}.insertBlock(${mediaQuery2js(node, fileName)});\n`;
        case NodeType.JssSupports:
            return tag`${STYLES_VAR_NAME}.insertBlock(${supports2js(node, fileName)});\n`;
        case NodeType.JssPage:
            return tag`${STYLES_VAR_NAME}.insertBlock(${page2js(node, fileName)});\n`;
        case NodeType.ImportDeclaration:
            return esImport2Js(node, fileName);
        case NodeType.ExportDeclaration:
            return esExport2Js(node, fileName);
        case NodeType.JssDeclaration:
        case NodeType.Comment:
        default:
            throw new Error(`unsupported node ${JSON.stringify(node)}`);
    }
}

export function translator(tree : SyntaxTree,
                           sourceFileName : string,
                           resultFileName : string) : GeneratedCode {
    const result = tree.map((node) => translateNode(node, sourceFileName));
    const source = makeNullSourceNode([
        `// this code is autogenerated, do not edit it
Object.defineProperty(exports, "__esModule", {
    value: true
});
var ${STYLES_VAR_NAME} = ${STYLES_VAR_NAME} ? ${STYLES_VAR_NAME} : new JssStylesheet();
exports.${EXPORT_VAR_NAME} = ${STYLES_VAR_NAME};
var self = null;\n\n`,
        //...result,
        ...result,
    ]);

    return new SourceNodeGenereatedCode(source, sourceFileName);
}
