import { makeLiteralToken, makeStringToken } from "token/helpers";
import { parse } from "./parser";
import { NodeType } from "./syntaxTree";

describe('parse()', () => {
    test('import parsing', () => {
        const tokens = [
            makeLiteralToken('import'),
            makeLiteralToken('_'),
            makeLiteralToken('from'),
            makeStringToken('"lodash"'),
        ]; //lexer(new StringInputStream(`import _ from 'lodash';`))
        const syntaxTree = parse(tokens);

        expect(syntaxTree).toEqual([
            { type: NodeType.JsImport, vars: '_', path: '"lodash"' }
        ]);
    });

});
