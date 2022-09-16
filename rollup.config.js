import resolve from '@rollup/plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import shebang from 'rollup-plugin-preserve-shebang';

export default {
    input: './build/bin/jss.js',
    output: {
        file: './build/jss.js',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [
        shebang(),
        sourcemaps(),
        resolve({
            // make it find the local imports
            moduleDirectories: ['build'],
            preferBuiltins: false,
        }),
    ]
};
