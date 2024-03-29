import fs from 'fs';
import { lexerMarkdown } from 'lexer/markdownLexer';
import { MarkdownNodeType, parseMarkdown, SourceCodeMarkdownNode } from 'parser/markdownParser';
import { ArrayTokenStream } from 'parser/tokenStream';
import path from 'path';
import { FileInputStream } from 'stream/input/FileInputStream';
import { TestModulePath } from 'stream/input/testModulePath';
import { evalTestCode } from 'testUtils';

const README_FILEPATH = path.join(__dirname, '../../README.md');
const TEST_FOLDER_PATH = path.join(__dirname, '../../test');

const testModulePath = new TestModulePath(TEST_FOLDER_PATH, __filename);

function testSourceCode(node : SourceCodeMarkdownNode, expectedNode? : SourceCodeMarkdownNode) {
    const output = evalTestCode(
        node.value,
        node.position.line,
        node.position.col,
        testModulePath,
    ).toCss();

    expect(output).toBeDefined();

    if (expectedNode) {
        expect(output.trim()).toEqual(expectedNode.value.trim());
    } else {
        console.warn(`source code at line ${node.position.line} doesn't have the matching output`)
        expect(output).toBeDefined();
    }
}

function testMdFile(mdFile : string) {
    expect(fs.existsSync(mdFile)).toBeTruthy();

    const tokens = new ArrayTokenStream(lexerMarkdown(FileInputStream.fromFile(mdFile)));
    const syntaxTree = parseMarkdown(tokens);
    expect(syntaxTree).toBeDefined();

    const sources = syntaxTree.filter(item => item.type == MarkdownNodeType.SOURCE_CODE);
    expect(sources).toBeDefined();

    const testCases = [] as [number, SourceCodeMarkdownNode, SourceCodeMarkdownNode?][];
    for(let i = 0; i < sources.length; i++) {
        const node = sources[i] as SourceCodeMarkdownNode;
        const nextNode = sources[i + 1] as SourceCodeMarkdownNode;
        if (node.title) {
            testModulePath.addVirtualFile(node.title, {
                startPos: node.position,
                content: node.value,
            });
        } else if (node.lang == 'jsslang') {
            if (nextNode && nextNode.lang == 'css') {
                testCases.push([node.position.line, node, nextNode]);
            } else {
                testCases.push([node.position.line, node, undefined]);
            }
        }
    }

    test.each(testCases)('test source code at line %d', (line, a1, a2) => {
        testSourceCode(a1, a2);
    });
}

describe('README.md', () => {
    testMdFile(README_FILEPATH);
});

describe('/test folder', () => {
    function getFilesToTest() : string[] {
        const dir = fs.readdirSync(TEST_FOLDER_PATH);
        return dir
            .filter(file => path.extname(file) == '.md');
    }

    describe.each(getFilesToTest())('test %s in /test', (file) => {
        testMdFile(path.join(TEST_FOLDER_PATH, file));
    });

});
