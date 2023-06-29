import { lexerMarkdown } from "lexer/markdownLexer";
import { StringInputStream } from "stream/input";
import { MarkdownNodeType, MarkdownSyntaxTree, parseMarkdown } from "./markdownParser";
import { ArrayTokenStream } from "./tokenStream";

function parse(str : string) : MarkdownSyntaxTree {
    const tokens = new ArrayTokenStream(lexerMarkdown(new StringInputStream(str)))
    return parseMarkdown(tokens);
}

const SIMPLE_MARKDOWN = `# Header 1

## Header 2
### Header 3

The Paragraph test
test

\`\`\`js
source code1
\`\`\`

\`\`\`js title='main.js'
source code2
\`\`\`

\`\`\`js title="main.js"
source code3
\`\`\`

\`\`\`css

\`\`\`
`;

describe('markdownParse()', () => {
    it('parses correct markdown', () => {
        expect(parse(SIMPLE_MARKDOWN)).toEqual([
            {type: MarkdownNodeType.H1, value: "Header 1"},
            {type: MarkdownNodeType.H2, value: "Header 2"},
            {type: MarkdownNodeType.H3, value: "Header 3"},
            {type: MarkdownNodeType.P, value: "The Paragraph test\ntest"},
            {type: MarkdownNodeType.SOURCE_CODE, lang: 'js', value: "source code1", position: {line: 10, col: 1}},
            {type: MarkdownNodeType.SOURCE_CODE, lang: 'js', value: "source code2", position: {line: 14, col: 1}, title: 'main.js'},
            {type: MarkdownNodeType.SOURCE_CODE, lang: 'js', value: "source code3", position: {line: 18, col: 1}, title: 'main.js'},
            {type: MarkdownNodeType.SOURCE_CODE, lang: 'css', value: "", position: {line: 21, col: 7}},
        ]);
    });
});
