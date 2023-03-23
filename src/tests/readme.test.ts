import fs from 'fs';
import { lexerMarkdown } from 'lexer/markdownLexer';
import { MarkdownNodeType, parseMarkdown, SourceCodeMarkdownNode } from 'parser/markdownParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import path from 'path';
import { FileInputStream } from 'stream/input/FileInputStream';
import { evalTestCode } from 'testUtils';

const README_FILEPATH = path.join(__dirname, '../../README.md');

function testSourceCode(node : SourceCodeMarkdownNode, expectedNode? : SourceCodeMarkdownNode) {
    const output = evalTestCode(
        node.value,
        node.position.line,
        node.position.col,
    ).toCss();

    if (expectedNode) {
        expect(output.trim()).toEqual(expectedNode.value.trim());
    } else {
        console.warn(`source code at line ${node.position.line} doesn't have the matching output`)
        expect(output).toBeDefined();
    }
}

describe('README.md', () => {
    it('tests all the examples in README.md', () => {
        expect(fs.existsSync(README_FILEPATH)).toBeTruthy();

        const tokens = new ArrayTokenStream(lexerMarkdown(new FileInputStream(README_FILEPATH)));
        const syntaxTree = parseMarkdown(tokens);
        expect(syntaxTree).toBeDefined();

        const sources = syntaxTree.filter(item => item.type == MarkdownNodeType.SOURCE_CODE);
        expect(sources).toBeDefined();

        for(let i = 0; i < sources.length; i++) {
            const node = sources[i] as SourceCodeMarkdownNode;
            if (node.lang == 'jsslang') {
                if (sources[i + 1]) {
                    testSourceCode(node, sources[i + 1] as SourceCodeMarkdownNode);
                } else {
                    testSourceCode(node);
                }
            }
        }
    });
});
