import * as swc from '@swc/core';
import { Transformer } from './transformer';

export function esmTransform(sourceCode : string) : string {
    return swc.transformSync(sourceCode, {
        sourceMaps: true,
        module: {
            type: 'commonjs',
        }
    }).code;
}

export function isTransformNeeded(code : string) : boolean {
    return code.includes('export ') || code.includes('import');
}

export class SwcTransformer implements Transformer<string, string> {
    transform(src: string): string {
        if (isTransformNeeded(src)) {
            return esmTransform(src);
        } else {
            return src;
        }
    }

}
