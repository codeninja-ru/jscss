import { SourceMapConsumer } from "source-map";
import { Position } from "stream/position";

class StackLine {
    constructor(readonly moduleName : string | undefined,
                readonly filePath : string | undefined,
                readonly position: Position | undefined) {
        Object.defineProperties(this, {
            moduleName: {
                writable: false,
            },
            filePath: {
                writable: false,
            },
            position: {
                writable: false,
            },
        })
    }

    toString() : string {
        if (this.moduleName) {
            if (this.position) {
                return `${this.moduleName} (${this.filePath}:${this.position.line}:${this.position.col})`;
            } else {
                return `${this.moduleName}`;
            }
        } else {
            if (this.position) {
                return `${this.filePath}:${this.position.line}:${this.position.col}`;
            } else {
                return `${this.filePath}`;
            }
        }
    }

    static formStackLine(stackLine : string) : StackLine {
        const fullLine = /at (.+)\((.+):(\d+):(\d+)\)$/gm.exec(stackLine);
        if (fullLine) {
            const [,moduleName, filePath, line, column] = fullLine;
            return new StackLine(moduleName.trim(), filePath, {line: Number(line), col: Number(column)});
        }

        const shortLine = /at (.+):(\d+):(\d+)$/gm.exec(stackLine);
        if (shortLine) {
            const [,filePath, line, column] = shortLine;
            return new StackLine(undefined, filePath, {line: Number(line), col: Number(column)});
        }

        const emptyLine = /at (.+)$/gm.exec(stackLine);
        if (emptyLine) {
            return new StackLine(emptyLine[1], undefined, undefined);
        }

        throw new Error(`unsupported stack line " ${stackLine} "`)
    }
}

export interface StackTrace {
    readonly errorMessage : string;
    readonly stack : StackLine[];
}

export class StackTrace implements StackTrace {
    constructor(readonly errorMessage : string,
                readonly stack : StackLine[]) {
        Object.defineProperties(this, {
            errorMessage: {
                writable: false,
            },
            stack: {
                writable: false,
            }
        });
    }

    static fromString(errorMessage : string) : StackTrace {
        const stack = errorMessage.split('\n');
        const message = stack[0];
        const stackList = stack.slice(1).map((line) => StackLine.formStackLine(line));

        return new StackTrace(message, stackList);
    }

    static fromError(error : Error) : StackTrace {
        if (error.stack === undefined) {
            throw new Error('Error.stack is undefined');
        }

        return StackTrace.fromString(error.stack);
    }
}

export interface StackTracePrinter {
    print(strackTrace : StackTrace) : void;
}

export class BasicStackTracePrinter implements StackTracePrinter {
    print(strackTrace : StackTrace) : void {
        console.log(strackTrace.errorMessage);
        strackTrace.stack.forEach((line) => {
            console.log(`     at ${line.toString()}`);
        });
    }
}

export class SourceMappedStackTrace implements StackTrace {
    constructor(private sourceMap : SourceMapConsumer,
                private stackTrack : StackTrace) {

    }

    get errorMessage() : string {
        return this.stackTrack.errorMessage;
    }

    get stack() : StackLine[] {
        const stack = [] as StackLine[];
        this.stackTrack.stack.forEach((item) => {
            if (item.position) {
                const {source, line, column} = this.sourceMap.originalPositionFor({
                    bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
                    line: item.position.line,
                    column: item.position.col,
                });

                if (column !== null && source !== null && line !== null) {
                    stack.push(new StackLine(
                        item.moduleName,
                        source,
                        {line: line, col: column}
                    ));
                } else {
                    stack.push(item);
                }
            }
        });

        return stack;
    }
}

export class VmScriptStrackTrace implements StackTrace {
    protected constructor(readonly errorMessage : string,
                readonly stack : StackLine[]) {
        Object.defineProperties(this, {
            errorMessage: {
                writable: false,
            },
            stack: {
                writable: false,
            }
        });
    }

    static fromStackTrace(stackTrace : StackTrace) {
        const stack = stackTrace.stack;

        let internalStackIdx = 0;
        stack.forEach((item, idx) => {
            if (item.filePath == 'node:vm' && item.moduleName == 'Script.runInContext') {
                internalStackIdx = idx;
            }
        });

        return new VmScriptStrackTrace(stackTrace.errorMessage, stack.slice(0, internalStackIdx));
    }
}
