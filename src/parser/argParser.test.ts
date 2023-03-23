import { argLexer } from "lexer/argLexer";
import { ArgNodeType, CommandArgNode, parseArgsStatement } from "parser/argParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { StringInputStream } from "stream/input";

function parse(str : string) : CommandArgNode {
    const tokens = new ArrayTokenStream(argLexer(new StringInputStream(str)));
    return parseArgsStatement(tokens);
}

describe('argParser', () => {
    it('parses -h', () => {
        expect(parse("--help")).toEqual({
            type: ArgNodeType.Help
        });
        expect(parse("-h")).toEqual({
            type: ArgNodeType.Help
        });
        expect(parse(" -h ")).toEqual({
            type: ArgNodeType.Help
        });
        expect(parse(" -h wrong")).toEqual({
            type: ArgNodeType.CommandError,
            message: 'unrecognized input "wrong"'
        });
        expect(parse("--help wrong")).toEqual({
            type: ArgNodeType.CommandError,
            message: 'unrecognized input "wrong"'
        });

        expect(parse("/tmp/input.jss")).toEqual({
            type: ArgNodeType.InputAndOutput,
            inputFile: "/tmp/input.jss",
            hasJsOption: false,
        });

        expect(parse("./tmp/input.jss C:/test/test.css")).toEqual({
            type: ArgNodeType.InputAndOutput,
            inputFile: "./tmp/input.jss",
            outputFile: "C:/test/test.css",
            hasJsOption: false,
        });

        expect(parse(" ")).toEqual({
            type: ArgNodeType.Nothing,
        });

        expect(parse("")).toEqual({
            type: ArgNodeType.Nothing,
        });

        expect(parse("/tmp/input.jss /tmp/output.css")).toEqual({
            type: ArgNodeType.InputAndOutput,
            inputFile: "/tmp/input.jss",
            outputFile: "/tmp/output.css",
            hasJsOption: false,
        });

        expect(parse("/tmp/input.jss -")).toEqual({
            type: ArgNodeType.InputAndOutput,
            inputFile: "/tmp/input.jss",
            outputFile: "-",
            hasJsOption: false,
        });

        expect(parse("-js")).toEqual({
            type: ArgNodeType.CommandError,
            message: 'invalid command'
        });

        expect(parse("-js /tmp/input.jss /tmp/output.css")).toEqual({
            type: ArgNodeType.InputAndOutput,
            inputFile: "/tmp/input.jss",
            outputFile: "/tmp/output.css",
            hasJsOption: true,
        });

        expect(parse("-v")).toEqual({
            type: ArgNodeType.Version,
        });

        expect(parse("--version")).toEqual({
            type: ArgNodeType.Version,
        });
    });

});
