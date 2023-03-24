import path from 'path';
import fs from 'fs';
import { evalTestCodeFile } from 'testUtils';

const ATOM_FILEPATH = path.join(__dirname, '../../test/atom.io.css');
const NORMALIZE_FILEPATH = path.join(__dirname, '../../test/normalize.css');
const GITHUB_FILEPATH = path.join(__dirname, '../../test/github.com.css');
const JQUERY_FILEPATH = path.join(__dirname, '../../test/jquery.js');

xdescribe('/test', () => {
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
            evalTestCodeFile(
                fs.readFileSync(JQUERY_FILEPATH).toString(),
                'jquery.js',
                'jquery.compliled.js',
            )
        ).toBeDefined();
    });
});
