import path from 'path';
import fs from 'fs';
import { evalTestCodeFile } from 'testUtils';
import { parseJssScript } from 'parser/jssParser';
import { ArrayTokenStream } from 'parser/tokenStream';

const ATOM_FILEPATH = path.join(__dirname, '../../test/vendor/atom.io.css');
const NORMALIZE_FILEPATH = path.join(__dirname, '../../test/vendor/normalize.css');
const GITHUB_FILEPATH = path.join(__dirname, '../../test/vendor/github.com.css');
const JQUERY_FILEPATH = path.join(__dirname, '../../test/vendor/jquery.js');

describe('/test', () => {
    it('parses atom.io.css', () => {
        expect(
            evalTestCodeFile(
                fs.readFileSync(ATOM_FILEPATH).toString(),
                'atom.io.jss',
                'atom.io.css',
            )
        ).toBeDefined();
    });

    it('parses normalize.css', () => {
        expect(
            evalTestCodeFile(
                fs.readFileSync(NORMALIZE_FILEPATH).toString(),
                'normalize.jss',
                'normalize.css',
            )
        ).toBeDefined();
    });

    it('parses github.com.css', () => {
        expect(
            evalTestCodeFile(
                fs.readFileSync(GITHUB_FILEPATH).toString(),
                'github.com.jss',
                'github.com.css',
            )
        ).toBeDefined();
    });

    it('parses jquery', () => {
        expect(
            // js shouldn't be run
            parseJssScript(ArrayTokenStream.fromFile(JQUERY_FILEPATH))
        ).toBeDefined();
    });
});
