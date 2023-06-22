import { SwcTransformer } from "./swcTransformer";

describe('class SwcTransformer', () => {
    it('translates ems module into commonjs', () => {
        const transformer = new SwcTransformer();
        expect(transformer.transform('export const hello = "world!";'))
            .toEqual(`"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "hello", {
    enumerable: true,
    get: function() {
        return hello;
    }
});
var hello = "world!";
`);
    });

});
