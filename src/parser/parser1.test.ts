import { StringInputStream } from "stream/input";
import { makeLiteralToken, makeSpaceToken, makeStringToken } from "token/helpers";
import { lexer } from "./lexer";
import { ArrayTokenStream, parse, parseCssBlock, parseCssImport, parseJsImport } from "./parser1";
import { NodeType } from "./syntaxTree";

describe('parser', () => {
    test('import parsing', () => {
        const tokens = [
            makeLiteralToken('import'),
            makeSpaceToken(),
            makeLiteralToken('_'),
            makeSpaceToken(),
            makeLiteralToken('from'),
            makeSpaceToken(),
            makeStringToken('"lodash"'),
        ]; //lexer(new StringInputStream(`import _ from 'lodash';`))
        const syntaxTree = parse(new ArrayTokenStream(tokens));

        expect(syntaxTree).toEqual([
            { type: NodeType.JsImport, vars: [{ varName: '_' }], path: '"lodash"', rawValue: 'import _ from "lodash"' }
        ]);
    });
});

describe('parsers', () => {
    test('parseJsImport()', () => {
        const tokens = lexer(new StringInputStream(`import * as test from 'somelib';`))

        const node = parseJsImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'somelib'", "type": NodeType.JsImport, "vars": [{"varAlias": "test", "varName": "*"}]});
    });

    test('parseCssBlock()', () => {
        const tokens = lexer(new StringInputStream(`a:hover, #id.class div, .class1 > .class2, input[type=button] { color: #555; }`));

        const node = parseCssBlock(new ArrayTokenStream(tokens));
        expect(node).toEqual({"block": "{ color: #555; }", "selectors": ["a:hover", "#id.class div", ".class1 > .class2", "input[type=button]"], "type": NodeType.CssBlock});
    });

    test('parseCssImport()', () => {
        const tokens = lexer(new StringInputStream(`@import 'style.css';`));

        const node = parseCssImport(new ArrayTokenStream(tokens));
        expect(node).toEqual({"path": "'style.css'", "type": NodeType.CssImport});
    });


});
