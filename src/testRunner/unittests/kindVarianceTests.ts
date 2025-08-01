import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindVariance", () => {
    describe("inferVarianceFromUsage", () => {
        it("should infer covariant variance from output positions", () => {
            const sourceText = `
                interface Container<out T> {
                    get(): T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should infer contravariant variance from input positions", () => {
            const sourceText = `
                interface Consumer<in T> {
                    consume(value: T): void;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Contravariant);
            }
        });

        it("should infer invariant variance from both input and output positions", () => {
            const sourceText = `
                interface Transformer<T> {
                    transform(input: T): T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Invariant);
            }
        });

        it("should return null for unused type parameters", () => {
            const sourceText = `
                interface Unused<T> {
                    value: number;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.isNull(variance);
            }
        });

        it("should handle class declarations", () => {
            const sourceText = `
                class Box<out T> {
                    constructor(private value: T) {}
                    getValue(): T {
                        return this.value;
                    }
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDecl = node as ts.ClassDeclaration;
                    return classDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should handle type aliases", () => {
            const sourceText = `
                type Function<in T, out R> = (arg: T) => R;
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                    const typeAlias = node as ts.TypeAliasDeclaration;
                    return typeAlias.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length >= 2) {
                const inputVariance = ts.inferVarianceFromUsage(typeParams[0], checker);
                const outputVariance = ts.inferVarianceFromUsage(typeParams[1], checker);
                
                assert.equal(inputVariance, ts.VarianceAnnotation.Contravariant);
                assert.equal(outputVariance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should handle function declarations", () => {
            const sourceText = `
                function identity<T>(value: T): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Invariant);
            }
        });

        it("should handle nested type parameter usage", () => {
            const sourceText = `
                interface Nested<out T> {
                    getNested(): Container<T>;
                }
                
                interface Container<out T> {
                    get(): T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should handle complex type parameter usage patterns", () => {
            const sourceText = `
                interface Complex<in T, out R> {
                    method1(input: T): void;
                    method2(): R;
                    method3(input: T): R;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length >= 2) {
                const inputVariance = ts.inferVarianceFromUsage(typeParams[0], checker);
                const outputVariance = ts.inferVarianceFromUsage(typeParams[1], checker);
                
                // T is used in both input and output positions in method3
                assert.equal(inputVariance, ts.VarianceAnnotation.Invariant);
                // R is used in both input and output positions in method3
                assert.equal(outputVariance, ts.VarianceAnnotation.Invariant);
            }
        });

        it("should handle type parameter constraints", () => {
            const sourceText = `
                interface Constrained<out T extends object> {
                    get(): T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should handle multiple type parameters with different variance", () => {
            const sourceText = `
                interface MultiVariance<in T, out R, U> {
                    inputOnly(value: T): void;
                    outputOnly(): R;
                    both(value: U): U;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length >= 3) {
                const inputVariance = ts.inferVarianceFromUsage(typeParams[0], checker);
                const outputVariance = ts.inferVarianceFromUsage(typeParams[1], checker);
                const bothVariance = ts.inferVarianceFromUsage(typeParams[2], checker);
                
                assert.equal(inputVariance, ts.VarianceAnnotation.Contravariant);
                assert.equal(outputVariance, ts.VarianceAnnotation.Covariant);
                assert.equal(bothVariance, ts.VarianceAnnotation.Invariant);
            }
        });
    });

    describe("edge cases", () => {
        it("should handle empty interfaces", () => {
            const sourceText = `
                interface Empty<T> {}
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.isNull(variance);
            }
        });

        it("should handle type parameters in generic constraints", () => {
            const sourceText = `
                interface ConstraintTest<T, U extends T> {
                    get(): U;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length >= 2) {
                const tVariance = ts.inferVarianceFromUsage(typeParams[0], checker);
                const uVariance = ts.inferVarianceFromUsage(typeParams[1], checker);
                
                // T is used in constraint, U is used in output position
                assert.isNull(tVariance); // Not used in body
                assert.equal(uVariance, ts.VarianceAnnotation.Covariant);
            }
        });

        it("should handle recursive type parameter usage", () => {
            const sourceText = `
                interface Recursive<T> {
                    get(): Recursive<T>;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const variance = ts.inferVarianceFromUsage(typeParam, checker);
                assert.equal(variance, ts.VarianceAnnotation.Covariant);
            }
        });
    });
}); 