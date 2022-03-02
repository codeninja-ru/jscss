import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeCommentReader } from "./comment";

describe('makeCommentReader()', () => {
    test('single line comment', () => {
        const reader = makeCommentReader(new StringInputStream("// this is a comment \n\nnew line"));
        expect(reader()).toEqual({
            type: TokenType.Comment,
            value: '// this is a comment '
        });
    });

    test('multiline comment', () => {
        const reader = makeCommentReader(new StringInputStream("/* this is a comment \n\nnew line :-* */"));
        expect(reader()).toEqual({
            type: TokenType.MultilineComment,
            value: "/* this is a comment \n\nnew line :-* */"
        });
    });

    test('empty', () => {
        const reader = makeCommentReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });

    test('regexp', () => {
        const reader = makeCommentReader(new StringInputStream("/[a-z]*\/'(*?)/gi"));
        expect(reader()).toEqual({
            type: TokenType.SlashBrackets,
            value: "/[a-z]*\/'(*?)/"
        });
    });

});
