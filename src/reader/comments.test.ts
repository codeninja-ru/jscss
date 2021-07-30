import { StringInputStream } from "stream/input";
import { makeCommentReader } from "./comment";

describe('makeCommentReader()', () => {
    test('single line comment', () => {
        const reader = makeCommentReader(new StringInputStream("// this is a comment \n\nnew line"));
        expect(reader()).toEqual({
            type: 'comment',
            value: '// this is a comment '
        });
    });

    test('multiline comment', () => {
        const reader = makeCommentReader(new StringInputStream("/* this is a comment \n\nnew line :-* */"));
        expect(reader()).toEqual({
            type: 'multiline_comment',
            value: "/* this is a comment \n\nnew line :-* */"
        });
    });

    test('empty', () => {
        const reader = makeCommentReader(new StringInputStream("    "));
        expect(reader()).toBeNull();
    });
});
