import { EvalContext } from "bin/evalContext";
import { CommonJsScript } from "./commonJsScript";

describe('class Script', () => {
    it('should run commonjs modules', () => {
        const evalContext = new EvalContext(require);
        const script = new CommonJsScript<string>('exports.test = 1 + 2;', 'script.js');

        const result = evalContext.runInContext(script);
        expect(result.exports.test).toEqual(3);
        expect(result.exports.test).toEqual(3);
    });

});
