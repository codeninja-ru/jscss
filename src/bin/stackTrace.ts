class StackLine {
    constructor(readonly moduleName : string | null,
                readonly filePath : string,
                readonly line : number,
                readonly column : number) {
        Object.defineProperties(this, {
            moduleName: {
                writable: false,
            },
            filePath: {
                writable: false,
            },
            line: {
                writable: false,
            },
            column: {
                writable: false,
            },
        })
    }

    toString() : string {
        if (this.moduleName) {
            return `${this.moduleName} (${this.filePath}:${this.line}:${this.column})`;
        } else {
            return `${this.filePath}:${this.line}:${this.column}`;
        }
    }

    static formStackLine(stackLine : string) : StackLine {
        const fullLine = /at (.+)\((.+):(\d+):(\d+)\)$/gm.exec(stackLine);
        if (fullLine) {
            const [,moduleName, filePath, line, column] = fullLine;
            return new StackLine(moduleName.trim(), filePath, Number(line), Number(column));
        } else {
            const shortLine = /at (.+):(\d+):(\d+)$/gm.exec(stackLine);
            if (shortLine) {

                const [,filePath, line, column] = shortLine;
                return new StackLine(null, filePath, Number(line), Number(column));
            } else {
                throw new Error(`unsupported stack line " ${stackLine} "`)
            }
        }
    }
}

export class StackTrace {
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

    print() {
        console.log(this.errorMessage + "\n");
        this.stack.forEach((line) => {
            console.log(`     at ${line.toString()}\n`);
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

export class ColoredStackTrace extends StackTrace {
    print() {
        //TODO
    }
}
