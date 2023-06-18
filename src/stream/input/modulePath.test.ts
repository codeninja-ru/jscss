import { Position } from "stream/position";
import { TEST_FOLDER_PATH } from "testUtils";
import { FsModulePath } from "./modulePath";
import { TestModulePath } from "./testModulePath";

describe('class ModulePath', () => {
    it('FsModulePath', () => {
        const modulePath = new FsModulePath(TEST_FOLDER_PATH, 'index.js');
        const file = modulePath.file('lib.js');
        const require = modulePath.createRequire();

        expect(file.exists()).toBeTruthy();
        expect(file.ext()).toEqual('.js');
        expect(file.fileName()).toEqual('lib.js');
        expect(file.inputStream()).toBeDefined();
        expect(file.filePath()).toEqual(TEST_FOLDER_PATH + '/lib.js');
        expect(modulePath.modulePath()).toEqual(TEST_FOLDER_PATH);
        expect(require('./lib.js')).toEqual({rgb: expect.anything()});

        const noFile = modulePath.file('nofile.js');
        expect(noFile.exists()).toBeFalsy();
    });

    it('TestModulePath', () => {
        const modulePath = new TestModulePath(TEST_FOLDER_PATH, 'index.js');
        const file = modulePath.file('lib.js');
        const require = modulePath.createRequire();

        expect(file.exists()).toBeTruthy();
        expect(file.ext()).toEqual('.js');
        expect(file.fileName()).toEqual('lib.js');
        expect(file.filePath()).toEqual(TEST_FOLDER_PATH + '/lib.js');
        expect(modulePath.modulePath()).toEqual(TEST_FOLDER_PATH);
        expect(require('./lib.js')).toEqual({rgb: expect.anything()});

        modulePath.addVirtualFile('virtual.js', {
            startPos: new Position(1, 1),
            content: 'exports.say = "hello world!";',
        });

        var vfile = modulePath.file('virtual.js');
        expect(vfile.exists()).toBeTruthy();
        expect(vfile.ext()).toEqual('.js');
        expect(vfile.fileName()).toEqual('virtual.js');
        expect(vfile.filePath()).toEqual(TEST_FOLDER_PATH + '/virtual.js');
        expect(modulePath.modulePath()).toEqual(TEST_FOLDER_PATH);
        expect(require('virtual.js')).toEqual({say: 'hello world!'});

        vfile = modulePath.file('./virtual.js');
        expect(vfile.exists()).toBeTruthy();
        expect(vfile.ext()).toEqual('.js');
        expect(vfile.fileName()).toEqual('virtual.js');
        expect(vfile.filePath()).toEqual(TEST_FOLDER_PATH + '/virtual.js');
        expect(vfile.inputStream().toString()).toEqual('exports.say = "hello world!";');
        expect(modulePath.modulePath()).toEqual(TEST_FOLDER_PATH);
        expect(require('virtual.js')).toEqual({say: 'hello world!'});
    });

});
