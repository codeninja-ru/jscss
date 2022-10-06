import { Symbols } from "symbols";
import { ParserError, SequenceError, UnexpectedEndError } from "./parserError";
import { anyLiteral, anyString, firstOf, leftHandRecurciveRule, map, noSpacesHere, oneOfSymbols, optional, returnRawValue, sequence, symbol } from "./parserUtils";
import { TokenParser } from "./tokenParser";
import { TokenStream } from "./tokenStream";
import { peekAndSkipSpaces, TokenStreamReader } from "./tokenStreamReader";

export enum ArgNodeType {
    // commands
    Nothing,
    InputAndOutput,
    Help,
    Version,

    // command modifiers
    Js,

    CommandError,
}
export type CommandArgNode = InputAndOutputArgNode | HelpArgNode | NothginArgNode | VersionArgNode | CommandErrorArgNode;

interface ArgNode {
    readonly type: ArgNodeType;
}

export interface InputAndOutputArgNode extends ArgNode {
    readonly type: ArgNodeType.InputAndOutput;
    readonly inputFile: string;
    readonly outputFile?: string;
    readonly hasJsOption: boolean;
}

export interface HelpArgNode extends ArgNode {
    readonly type: ArgNodeType.Help;
}

export interface NothginArgNode extends ArgNode {
    readonly type: ArgNodeType.Nothing;
}

export interface VersionArgNode extends ArgNode {
    readonly type: ArgNodeType.Version;
}

export interface CommandErrorArgNode extends ArgNode {
    readonly type: ArgNodeType.CommandError;
    readonly message: string;
}

/**
 * a short option
 * implements:
 * option:
 *  - literal
 * @example -h
 *
 *
 * */
function option(name : string) : TokenParser {
    return function(stream : TokenStream) : string {
        const [,,optionName] = sequence(
            symbol(Symbols.minus),
            noSpacesHere,
            anyLiteral,
        )(stream);

        if (optionName.value != name) {
            throw new ParserError(`-${optionName.value} is unrecognized option`, optionName);
        }

        return optionName.value;
    };
}

/**
 * implements:
 * longOption:
 *  -- literal
 *
 * @example --help
 * */
function longOption(name : string) : TokenParser {
    return function(stream : TokenStream) : string {
        const [,,optionName] = sequence(
            symbol(Symbols.minus2),
            noSpacesHere,
            anyLiteral,
        )(stream);

        if (optionName.value != name) {
            throw new ParserError(`--${name} is unrecognized option`, optionName);
        }

        return optionName.value;
    };
}

/**
 * implements:
 * path:
 * : [/ | \ | literal | . | ]+ (no with spaces)
 * : anyString
 * @example /etc/config.conf or config.conf or C:/config.conf (for Windoes)
 *
 * */
function path(stream : TokenStream) : string {
    return map(returnRawValue(
        firstOf(
            anyString,
            leftHandRecurciveRule(
                firstOf(
                    oneOfSymbols(Symbols.backslash, Symbols.div, Symbols.dot),
                    anyLiteral,
                ),
                sequence(
                    noSpacesHere,
                    firstOf(
                        oneOfSymbols(Symbols.div, Symbols.backslash, Symbols.dot, Symbols.colon),
                        anyLiteral,
                    ),
                )
            )
        )
    ), (out : string) => out.trim())(stream);
}

function makeOption(shortName: string, longName: string) : TokenParser {
    return firstOf(
        option(shortName),
        longOption(longName)
    );
}

function helpOption(stream : TokenStream) : HelpArgNode {
    makeOption('h', 'help')(stream);

    return {
        type: ArgNodeType.Help,
    };
}

function versionOption(stream : TokenStream) : VersionArgNode {
    makeOption('v', 'version')(stream);

    return {
        type: ArgNodeType.Version,
    };
}

function jsOption(stream : TokenStream) : boolean {
    option('js')(stream);

    return true;
}

function endOfTheSteam(stream : TokenStream,
                      peekFn : TokenStreamReader = peekAndSkipSpaces) : void {
    let token;
    try {
        token = peekFn(stream);
    } catch(e) {
        if (e instanceof UnexpectedEndError) {
            return;
        }

        throw e;
    }

    throw new Error(`unrecognized input "${token.value}"`);
}


/**
 * implements:
 * filename [outputfile]
 *
 * */
function readFileAndWrite(stream : TokenStream) : InputAndOutputArgNode {
    const [hasJsOption, inputFile, outputFile] = sequence(
        optional(jsOption),
        path,
        optional(firstOf(
            symbol(Symbols.minus),
            path,
        )),
    )(stream);

    let out;
    if (outputFile && outputFile.value && outputFile.value == '-') {
        out = '-';
    } else {
        out = outputFile;
    }

    return {
        type: ArgNodeType.InputAndOutput,
        inputFile: inputFile,
        outputFile: out,
        hasJsOption: hasJsOption === true,
    };
}

function nothing(stream : TokenStream) : NothginArgNode {
    try {
        peekAndSkipSpaces(stream);
    } catch(e) {
        return {
            type: ArgNodeType.Nothing
        };
    }

    throw new Error('nothing is expected');
}

function processError(e : Error) : CommandErrorArgNode {
    if (e instanceof UnexpectedEndError) {
        return {
            type: ArgNodeType.CommandError,
            message: 'invalid command'
        };
    } else if (e instanceof ParserError) {
        return {
            type: ArgNodeType.CommandError,
            message: 'unrecognized command'
        };
    } else if (e instanceof SequenceError) {
        return processError(e.cause);
    } else {
        return {
            type: ArgNodeType.CommandError,
            message: e.message,
        };
    }
}

export function parseArgsStatement(stream : TokenStream) : CommandArgNode {
    try {
        const node = firstOf(
            nothing,
            helpOption,
            versionOption,
            readFileAndWrite,
        )(stream);

        endOfTheSteam(stream);

        return node;
    } catch(e) {
        return processError(e);
    }
}
