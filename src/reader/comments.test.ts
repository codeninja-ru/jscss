import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeCommentAndRegexpReader } from "./comment";

describe('makeCommentReader()', () => {
    test('single line comment', () => {
        const reader = makeCommentAndRegexpReader(new StringInputStream("// this is a comment \n\nnew line"));
        expect(reader()).toEqual({
            type: TokenType.Comment,
            value: '// this is a comment '
        });
    });

    test('multiline comment', () => {
        const reader = makeCommentAndRegexpReader(new StringInputStream("/* this is a comment \n\nnew line :-* */"));
        expect(reader()).toEqual({
            type: TokenType.MultilineComment,
            value: "/* this is a comment \n\nnew line :-* */"
        });
    });

    test('empty', () => {
        const reader = makeCommentAndRegexpReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });
});
