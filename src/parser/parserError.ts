import { Token } from "token";

function formatError(token : Token, errorMessage : string) : string {
    return `(${token.position.line}:${token.position.col}) : ` + errorMessage;
}

export class ParserError extends Error {
    constructor(message : string, token : Token) {
        super(formatError(token, message));
    }
}
