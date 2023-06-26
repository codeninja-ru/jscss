import { TEST_FOLDER_PATH } from "testUtils";
import { FsFile } from "./file";
import path from 'path';

describe('class FsFile', () => {
    it('fixes the extention', () => {
        const file = new FsFile(path.join(TEST_FOLDER_PATH, './lib'));
        expect(file.filePath()).toEqual(path.join(TEST_FOLDER_PATH, 'lib.js'));
        expect(file.exists()).toBeTruthy();
        expect(file.fileName()).toEqual('lib.js');
        expect(file.ext()).toEqual('.js');
    });

    it('works', () => {
        const file = new FsFile(path.join(TEST_FOLDER_PATH, './lib.js'));
        expect(file.filePath()).toEqual(path.join(TEST_FOLDER_PATH, 'lib.js'));
        expect(file.exists()).toBeTruthy();
        expect(file.fileName()).toEqual('lib.js');
        expect(file.ext()).toEqual('.js');
    });

});
