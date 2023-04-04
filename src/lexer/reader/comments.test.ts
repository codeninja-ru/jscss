import { StringInputStream } from "stream/input";
import { TokenType } from "token";
import { commentReader, cssCommentReader } from "./comments";

describe('commentReader()', () => {
    test('single line comment', () => {
        expect(commentReader(new StringInputStream("// this is a comment \n\nnew line"))).toEqual({
            type: TokenType.Comment,
            position: {line: 1, col: 1},
            value: '// this is a comment '
        });
    });

    test('multiline comment', () => {
        expect(commentReader(new StringInputStream("/* this is a comment \n\nnew line :-* */"))).toEqual({
            type: TokenType.MultilineComment,
            position: {line: 1, col: 1},
            value: "/* this is a comment \n\nnew line :-* */"
        });
    });

    test('multiline comment, do not read forward', () => {
        expect(commentReader(new StringInputStream("/* this is a comment \n\nnew line :-* */do_not_read"))).toEqual({
            type: TokenType.MultilineComment,
            position: {line: 1, col: 1},
            value: "/* this is a comment \n\nnew line :-* */"
        });
    });

    test('multiline comment, do not read forward 2', () => {
        expect(commentReader(new StringInputStream("/* test */no!"))).toEqual({
            type: TokenType.MultilineComment,
            position: {line: 1, col: 1},
            value: "/* test */"
        });
    });

    test('without the end', () => {
        expect(commentReader(new StringInputStream("/* this is a comment"))).toEqual({
            type: TokenType.MultilineComment,
            position: {line: 1, col: 1},
            value: "/* this is a comment"
        });
    });


    test('empty', () => {
        expect(commentReader(new StringInputStream("    "))).toBeNull();
    });
});

describe('makeCssCommentReader()', () => {
    test('sigle line', () => {
        expect(cssCommentReader(new StringInputStream("<!-- this is a comment -->"))).toEqual({
            type: TokenType.CssComment,
            position: {line: 1, col: 1},
            value: '<!-- this is a comment -->'
        });
    });

    test('multiline comment', () => {
        expect(cssCommentReader(new StringInputStream("<!-- this is a comment \n\nnew line :-* -->"))).toEqual({
            type: TokenType.CssComment,
            position: {line: 1, col: 1},
            value: "<!-- this is a comment \n\nnew line :-* -->"
        });
    });

    test('it starts with < but it is not a comment', () => {
        expect(cssCommentReader(new StringInputStream("< 10"))).toEqual({
            type: TokenType.Symbol,
            position: {line: 1, col: 1},
            value: "<"
        });

        expect(cssCommentReader(new StringInputStream("<< 10"))).toEqual({
            type: TokenType.Symbol,
            position: {line: 1, col: 1},
            value: "<<"
        });
    });

    test('empty', () => {
        expect(cssCommentReader(new StringInputStream("    "))).toBeNull();
    });

});
