import resolve from '@rollup/plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';

export default {
    input: './build/bin/jss.js',
    output: {
        file: './build/jss.js',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [
        sourcemaps(),
        resolve({
            // make it find the local imports
            moduleDirectories: ['build'],
            preferBuiltins: false,
        })
    ]
};
