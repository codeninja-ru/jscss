import { parseJssScript } from "parser/jssParser";
import { ArrayTokenStream } from "parser/tokenStream";
import { translator } from "./translator";

const CSS = `@import 'main.css';

.className {
  color: red;
}`;

describe('translator()', () => {
    it('translates simple css', () => {
        const result = translator(parseJssScript(ArrayTokenStream.fromString(CSS)));
        expect(result).toEqual(CSS);
    });

});
