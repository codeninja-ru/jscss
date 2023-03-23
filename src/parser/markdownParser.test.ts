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
source code
\`\`\`
`;

describe('markdownParse()', () => {
    it('parses correct markdown', () => {
        expect(parse(SIMPLE_MARKDOWN)).toEqual([
            {type: MarkdownNodeType.H1, value: "Header 1"},
            {type: MarkdownNodeType.H2, value: "Header 2"},
            {type: MarkdownNodeType.H3, value: "Header 3"},
            {type: MarkdownNodeType.P, value: "The Paragraph test\ntest"},
            {type: MarkdownNodeType.SOURCE_CODE, lang: 'js', value: "source code", position: {line: 10, col: 1}}
        ]);
    });

});
