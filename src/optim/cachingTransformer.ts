import * as ts from 'typescript';
import path from 'path';

// Example of the tranformation:
//
//const result = firstOf(
//    jssPropertyDefinition,
//    jssSpreadDefinition,
//)(stream);
//
// Transforms to:
//
// const result = instance(1, () => firstOf(
//     jssPropertyDefinition,
//     jssSpreadDefinition,
// ))(stream);

function wrapFn(node: ts.CallExpression, id : number) : ts.CallExpression {
    const ce = ts.factory.createCallExpression(
        ts.factory.createIdentifier('instance'),
        undefined,
        [
            ts.factory.createNumericLiteral(id),
            ts.factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                node,
            )
        ],
    );

    return ce;
}

let combinatorIdx = 0;

export default function (program: ts.Program) {
    return {
        before(context: ts.TransformationContext) {
            return (sourceFile: ts.SourceFile) => {
                const baseDir = path.basename(path.dirname(sourceFile.fileName));

                if (baseDir != 'parser') {
                    return sourceFile;
                }

                if (sourceFile.fileName.endsWith('parserUtils.ts')) {
                    return sourceFile;
                }

                const visitor = (node: ts.Node): ts.Node => {
                    if (ts.isCallExpression(node)) {
                        if(ts.isIdentifier(node.expression))
                            switch(node.expression.escapedText) {
                                case 'firstOf':
                                case 'sequence':
                                case 'sequenceWithPosition':
                                case 'symbol':
                                case 'literalKeyword':
                                case 'lazyBlock':
                                case 'strictLoop':
                                case 'loop':
                                case 'oneOfSymbols':
                                case 'oneOfSimpleSymbols':
                                case 'commaList':
                                case 'returnRawValueWithPosition':
                                case 'returnRawValue':
                                case 'optional':
                                case 'leftHandRecurciveRule':
                                //case 'probe':
                                    return wrapFn(node, combinatorIdx++);
                                default:
                                    break;
                            }
                    }

                    return ts.visitEachChild(node, visitor, context);
                };



                return ts.factory.updateSourceFile(sourceFile, [
                    // Ensures the rest of the source files statements are still defined.
                    ts.factory.createImportDeclaration(
                        undefined,
                        undefined,
                        ts.factory.createImportClause(
                            false,
                            undefined,
                            ts.factory.createNamedImports([ts.factory.createImportSpecifier(
                                undefined,
                                ts.factory.createIdentifier("instance")
                            )])
                        ),
                        ts.factory.createStringLiteral("optim/cache"),
                    ),
                    //...sourceFile.statements,
                    ...ts.visitNode(sourceFile, visitor).statements,
                ]);


                //return ts.visitNode(sourceFile, visitor);
            }
        }
    }
}
