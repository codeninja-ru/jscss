import { makeLiteralToken, makeSpaceToken, makeStringToken } from "token/helpers";
import { parse } from "./parser";
import { NodeType } from "./syntaxTree";

describe('parse()', () => {
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
        const syntaxTree = parse(tokens);

        expect(syntaxTree).toEqual([
            { type: NodeType.JsImport, vars: '_', path: '"lodash"', rawValue: 'import _ from "lodash"' }
        ]);
    });

});
