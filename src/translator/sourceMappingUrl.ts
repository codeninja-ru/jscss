import { SourceMapGenerator } from "source-map";

export class SourceMappingUrl {
    constructor(private sourceMapGen : SourceMapGenerator) {
    }

    toUrl() : string {
        const base64Map = Buffer.from(
            this.sourceMapGen.toString(),
            'utf8'
        ).toString('base64');
        return `data:application/json;charset=utf-8;base64,${base64Map}`;
    }
}
