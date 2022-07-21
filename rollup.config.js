import path from 'path';
import resolve from '@rollup/plugin-node-resolve';

console.log(process.cwd());

export default {
    input: './build/bin/jss.js',
    output: {
        file: './build/jss.js',
        format: 'cjs'
    },
    plugins: [resolve({
        // make it find the local imports
        moduleDirectories: ['build', 'node_modules'],
        preferBuiltins: false,
    })]
};
