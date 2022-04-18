import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { makeCommentAndRegexpReader, makeCssCommentReader } from "./comment";

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

    test('without the end', () => {
        const reader = makeCommentAndRegexpReader(new StringInputStream("/* this is a comment"));
        expect(reader()).toEqual({
            type: TokenType.MultilineComment,
            value: "/* this is a comment"
        });
    });


    test('empty', () => {
        const reader = makeCommentAndRegexpReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });
});

describe('makeCssCommentReader()', () => {
    test('sigle line', () => {
        const reader = makeCssCommentReader(new StringInputStream("<!-- this is a comment -->"));
        expect(reader()).toEqual({
            type: TokenType.CssComment,
            value: '<!-- this is a comment -->'
        });
    });

    test('multiline comment', () => {
        const reader = makeCssCommentReader(new StringInputStream("<!-- this is a comment \n\nnew line :-* -->"));
        expect(reader()).toEqual({
            type: TokenType.CssComment,
            value: "<!-- this is a comment \n\nnew line :-* -->"
        });
    });

    test('it starts with < but it is not a comment', () => {
        let reader = makeCssCommentReader(new StringInputStream("< 10"));
        expect(reader()).toEqual({
            type: TokenType.Symbol,
            value: "<"
        });

        reader = makeCssCommentReader(new StringInputStream("<< 10"));
        expect(reader()).toEqual({
            type: TokenType.Symbol,
            value: "<<"
        });
    });

    test('empty', () => {
        const reader = makeCssCommentReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });
});
