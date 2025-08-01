import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindConstraintInference", () => {
    describe("findReferencedTypeParameters", () => {
        it("should find type parameters referenced in constraints", () => {
            const sourceText = `
                function test<T, U extends T>(value: U): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 1) {
                const constraint = typeParams[1].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 1);
                    assert.equal(referenced[0], typeParams[0]);
                }
            }
        });

        it("should find multiple type parameters in complex constraints", () => {
            const sourceText = `
                function complex<T, U, V extends T & U>(value: V): T | U {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 2) {
                const constraint = typeParams[2].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 2);
                    assert.include(referenced, typeParams[0]);
                    assert.include(referenced, typeParams[1]);
                }
            }
        });

        it("should handle constraints with no type parameter references", () => {
            const sourceText = `
                function test<T extends string>(value: T): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 0) {
                const constraint = typeParams[0].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 0);
                }
            }
        });

        it("should handle nested type parameter references", () => {
            const sourceText = `
                function nested<T, U extends Array<T>>(value: U): T {
                    return value[0];
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 1) {
                const constraint = typeParams[1].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 1);
                    assert.equal(referenced[0], typeParams[0]);
                }
            }
        });

        it("should handle union type constraints", () => {
            const sourceText = `
                function union<T, U extends T | string>(value: U): T {
                    return value as T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 1) {
                const constraint = typeParams[1].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 1);
                    assert.equal(referenced[0], typeParams[0]);
                }
            }
        });

        it("should handle intersection type constraints", () => {
            const sourceText = `
                function intersection<T, U extends T & { id: number }>(value: U): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 1) {
                const constraint = typeParams[1].constraint;
                if (constraint) {
                    const referenced = ts.findReferencedTypeParameters(constraint, typeParams);
                    assert.equal(referenced.length, 1);
                    assert.equal(referenced[0], typeParams[0]);
                }
            }
        });
    });

    describe("ensureNarrowedSetConformsToConstraint", () => {
        it("should ensure narrowed types conform to original constraints", () => {
            const sourceText = `
                function test<T extends string>(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                const result = ts.ensureNarrowedSetConformsToConstraint(
                    typeParam,
                    typeParam.constraint,
                    checker
                );
                assert.isTrue(result);
            }
        });

        it("should handle complex constraint validation", () => {
            const sourceText = `
                function complex<T extends object, U extends keyof T>(obj: T, key: U): T[U] {
                    return obj[key];
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 1) {
                const constraint = typeParams[1].constraint;
                if (constraint) {
                    const result = ts.ensureNarrowedSetConformsToConstraint(
                        typeParams[1],
                        constraint,
                        checker
                    );
                    assert.isTrue(result);
                }
            }
        });

        it("should handle constraint violations", () => {
            const sourceText = `
                function test<T extends number>(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                // Create a mock narrowed type that doesn't conform to the constraint
                const mockNarrowedType = {
                    flags: 0x1, // TypeFlags.Any (not number)
                    symbol: undefined
                } as any;
                
                const result = ts.ensureNarrowedSetConformsToConstraint(
                    typeParam,
                    mockNarrowedType,
                    checker
                );
                assert.isFalse(result);
            }
        });

        it("should handle union type constraints", () => {
            const sourceText = `
                function union<T extends string | number>(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                const result = ts.ensureNarrowedSetConformsToConstraint(
                    typeParam,
                    typeParam.constraint,
                    checker
                );
                assert.isTrue(result);
            }
        });

        it("should handle intersection type constraints", () => {
            const sourceText = `
                function intersection<T extends object & { id: number }>(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                const result = ts.ensureNarrowedSetConformsToConstraint(
                    typeParam,
                    typeParam.constraint,
                    checker
                );
                assert.isTrue(result);
            }
        });
    });

    describe("integration tests", () => {
        it("should work together for complex constraint scenarios", () => {
            const sourceText = `
                function complex<T, U extends T, V extends U & { id: number }>(
                    value: V
                ): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 2) {
                // Test finding referenced type parameters
                const uConstraint = typeParams[1].constraint;
                if (uConstraint) {
                    const referencedInU = ts.findReferencedTypeParameters(uConstraint, typeParams);
                    assert.equal(referencedInU.length, 1);
                    assert.equal(referencedInU[0], typeParams[0]);
                }
                
                const vConstraint = typeParams[2].constraint;
                if (vConstraint) {
                    const referencedInV = ts.findReferencedTypeParameters(vConstraint, typeParams);
                    assert.equal(referencedInV.length, 1);
                    assert.equal(referencedInV[0], typeParams[1]);
                }
                
                // Test constraint validation
                if (uConstraint) {
                    const uResult = ts.ensureNarrowedSetConformsToConstraint(
                        typeParams[1],
                        uConstraint,
                        checker
                    );
                    assert.isTrue(uResult);
                }
                
                if (vConstraint) {
                    const vResult = ts.ensureNarrowedSetConformsToConstraint(
                        typeParams[2],
                        vConstraint,
                        checker
                    );
                    assert.isTrue(vResult);
                }
            }
        });

        it("should handle nested generic constraints", () => {
            const sourceText = `
                function nested<T, U extends Array<T>, V extends U[0]>(
                    value: V
                ): T {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameters
            const typeParams = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters;
                }
                return undefined;
            });
            
            if (typeParams && typeParams.length > 2) {
                // Test finding referenced type parameters in nested constraints
                const uConstraint = typeParams[1].constraint;
                if (uConstraint) {
                    const referencedInU = ts.findReferencedTypeParameters(uConstraint, typeParams);
                    assert.equal(referencedInU.length, 1);
                    assert.equal(referencedInU[0], typeParams[0]);
                }
                
                const vConstraint = typeParams[2].constraint;
                if (vConstraint) {
                    const referencedInV = ts.findReferencedTypeParameters(vConstraint, typeParams);
                    assert.equal(referencedInV.length, 1);
                    assert.equal(referencedInV[0], typeParams[1]);
                }
            }
        });
    });

    describe("edge cases", () => {
        it("should handle empty type parameter lists", () => {
            const sourceText = `
                function test(value: string): string {
                    return value;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the function declaration
            const funcDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            if (funcDecl) {
                const funcDeclTyped = funcDecl as ts.FunctionDeclaration;
                const typeParams = funcDeclTyped.typeParameters || [];
                
                // Test with empty type parameter list
                const referenced = ts.findReferencedTypeParameters(funcDecl, typeParams);
                assert.equal(referenced.length, 0);
            }
        });

        it("should handle constraints without type parameter references", () => {
            const sourceText = `
                function test<T extends "literal">(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                const referenced = ts.findReferencedTypeParameters(typeParam.constraint, [typeParam]);
                assert.equal(referenced.length, 0);
            }
        });

        it("should handle recursive type parameter references", () => {
            const sourceText = `
                function recursive<T extends T>(value: T): T {
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
            
            if (typeParam && typeParam.constraint) {
                const referenced = ts.findReferencedTypeParameters(typeParam.constraint, [typeParam]);
                assert.equal(referenced.length, 1);
                assert.equal(referenced[0], typeParam);
            }
        });
    });
}); 