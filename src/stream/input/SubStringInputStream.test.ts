import { Position } from "stream/position";
import { TokenType } from "token";
import { InputStream } from "./InputStream";
import { SubStringInputStream } from "./SubStringInputStream";

function streamToString(stream : InputStream) : string {
    var result = '';
    while(!stream.isEof()) {
        result += stream.next();
    }

    return result;
}

describe('SubStringInputStream', () => {
    it('creates a stream from a block', () => {
        const stream = SubStringInputStream.fromBlockToken({
            type: TokenType.LazyBlock,
            value: '{ hello world }',
            position: new Position(5, 5)
        });

        expect(stream).toBeDefined();
        expect(stream.isEof()).toBeFalsy();
        expect(stream.position()).toEqual({line: 5, col: 6});
        expect(streamToString(stream)).toEqual(' hello world ');
        expect(stream.isEof()).toBeTruthy();
        expect(stream.position()).toEqual({line: 5, col: 18});
    });

    it('creates a stream from an empty block', () => {
        const stream = SubStringInputStream.fromBlockToken({
            type: TokenType.LazyBlock,
            value: '{}',
            position: new Position(5, 5)
        });

        expect(stream).toBeDefined();
        expect(stream.isEof()).toBeTruthy();
        expect(stream.position()).toEqual({line: 5, col: 6});
        expect(streamToString(stream)).toEqual('');
        expect(stream.isEof()).toBeTruthy();
        expect(stream.position()).toEqual({line: 5, col: 6});
    });

    it('throws an exemption when value is an empty string', () => {
        expect(() => {
            SubStringInputStream.fromBlockToken({
                type: TokenType.LazyBlock,
                value: '',
                position: new Position(5, 5)
            });
        }).toThrowError('invalid block token');
    });


});
