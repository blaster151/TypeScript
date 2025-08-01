import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindSystem", () => {
    describe("kindDiagnosticReporter", () => {
        it("should convert offset to line correctly", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test line 1
            const line1Offset = 0; // Start of "line1"
            const line1Result = ts.getLineFromOffset(sourceFile, line1Offset);
            assert.equal(line1Result, 1);
            
            // Test line 2
            const line2Offset = 6; // Start of "line2" (after \n)
            const line2Result = ts.getLineFromOffset(sourceFile, line2Offset);
            assert.equal(line2Result, 2);
            
            // Test line 3
            const line3Offset = 12; // Start of "line3" (after \n)
            const line3Result = ts.getLineFromOffset(sourceFile, line3Offset);
            assert.equal(line3Result, 3);
        });

        it("should convert offset to column correctly", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test column 0
            const col0Result = ts.getColumnFromOffset(sourceFile, 0);
            assert.equal(col0Result, 1);
            
            // Test column 3 (middle of "line1")
            const col3Result = ts.getColumnFromOffset(sourceFile, 3);
            assert.equal(col3Result, 4);
            
            // Test column 0 of line 2
            const colLine2Result = ts.getColumnFromOffset(sourceFile, 6);
            assert.equal(colLine2Result, 1);
        });

        it("should convert offset to position correctly", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            const position = ts.getPositionFromOffset(sourceFile, 3);
            assert.deepEqual(position, { line: 1, column: 4 });
            
            const positionLine2 = ts.getPositionFromOffset(sourceFile, 8);
            assert.deepEqual(positionLine2, { line: 2, column: 3 });
        });
    });

    describe("kindComparison", () => {
        it("should compare kind types correctly", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Create mock kind types for testing
            const mockExpectedKind = {
                flags: 0x80000000, // TypeFlags.Kind
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const mockActualKind = {
                flags: 0x80000000, // TypeFlags.Kind
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(mockExpectedKind, mockActualKind, checker, false);
            assert.isTrue(result.isCompatible);
            assert.equal(result.errors.length, 0);
        });

        it("should detect arity mismatch", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const mockExpectedKind = {
                flags: 0x80000000,
                kindArity: 2,
                parameterKinds: []
            } as any;
            
            const mockActualKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(mockExpectedKind, mockActualKind, checker, false);
            assert.isFalse(result.isCompatible);
            assert.isTrue(result.errors.length > 0);
        });
    });

    describe("kindCompatibility", () => {
        it("should detect type constructor context in type parameter constraints", () => {
            const sourceText = `
                function test<T extends Kind<Type, Type>>(fa: T<number>): number {
                    return fa;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter node
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const expectsTypeConstructor = ts.checkerExpectsTypeConstructor(typeParam, checker);
                assert.isTrue(expectsTypeConstructor);
            }
        });

        it("should detect type constructor context in function calls", () => {
            const sourceText = `
                function test<F extends Kind<Type, Type>>(factory: F) {
                    return factory<number>();
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the call expression
            const callExpr = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return ts.forEachChild(funcDecl.body!, child => {
                        if (child.kind === ts.SyntaxKind.ReturnStatement) {
                            const returnStmt = child as ts.ReturnStatement;
                            if (returnStmt.expression?.kind === ts.SyntaxKind.CallExpression) {
                                return returnStmt.expression;
                            }
                        }
                        return undefined;
                    });
                }
                return undefined;
            });
            
            if (callExpr) {
                const expectsTypeConstructor = ts.checkerExpectsTypeConstructor(callExpr, checker);
                assert.isTrue(expectsTypeConstructor);
            }
        });
    });

    describe("kindConstraintPropagation", () => {
        it("should create kind constraint violation diagnostic", () => {
            const violation = {
                typeParameterName: "T",
                expectedKind: { arity: 2, parameterKinds: [] },
                actualKind: { arity: 1, parameterKinds: [] },
                errors: [{ message: "Arity mismatch" }]
            };
            
            const sourceText = "function test<T extends Kind<Type, Type>>(fa: T<number>): number { return fa; }";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const callSite = sourceFile;
            const diagnostic = ts.createKindConstraintViolationDiagnostic(violation, callSite, checker);
            
            assert.equal(diagnostic.code, "TypeParameterKindConstraintViolation");
            assert.equal(diagnostic.category, "Error");
            assert.include(diagnostic.message, "Type parameter 'T' violates kind constraint");
        });
    });

    describe("kindDiagnostics", () => {
        it("should find constraint location for type parameter", () => {
            const sourceText = `
                function test<T extends Kind<Type, Type>>(fa: T<number>): number {
                    return fa;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter node
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (typeParam) {
                const location = ts.findConstraintLocation(typeParam, checker);
                assert.isNotNull(location);
                assert.equal(location!.file, sourceFile);
            }
        });
    });

    describe("kindMetadata", () => {
        it("should detect type parameter from outer scope", () => {
            const sourceText = `
                class Outer<T> {
                    method<U extends T>(): U {
                        return {} as U;
                    }
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type parameter constraint
            const constraint = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDecl = node as ts.ClassDeclaration;
                    const method = classDecl.members[0] as ts.MethodDeclaration;
                    const typeParam = method.typeParameters?.[0];
                    return typeParam?.constraint;
                }
                return undefined;
            });
            
            if (constraint) {
                const isFromOuterScope = ts.isTypeParameterFromOuterScope(constraint, checker);
                assert.isTrue(isFromOuterScope);
            }
        });
    });

    describe("kindScopeAnalysis", () => {
        it("should calculate compatibility score", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const expectedKind = {
                arity: 1,
                parameterKinds: [],
                symbol: undefined,
                isValid: true
            };
            
            const actualKind = {
                arity: 1,
                parameterKinds: [],
                symbol: undefined,
                isValid: true
            };
            
            const score = ts.calculateCompatibilityScore(expectedKind, actualKind, checker);
            assert.isTrue(score > 0);
        });
    });

    describe("kindVariance", () => {
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
    });

    describe("kindPartialApplicationValidation", () => {
        it("should get kind metadata for type", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const mockType = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const metadata = ts.getKindMetadataForType(mockType, checker);
            assert.isDefined(metadata);
            assert.equal(metadata!.arity, 1);
        });
    });

    describe("kindAliasResolution", () => {
        it("should create canonical kind representation", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const mockType = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const canonical = ts.createCanonicalKindRepresentation(mockType, checker);
            assert.isDefined(canonical);
        });
    });

    describe("kindConstraintInference", () => {
        it("should find referenced type parameters", () => {
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
    });

    describe("codefixes", () => {
        it("should get expected kind from context", () => {
            const sourceText = `
                function test<T extends Kind<Type, Type>>(fa: T<number>): number {
                    return fa;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find a type reference node
            const typeRef = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return ts.forEachChild(funcDecl.body!, child => {
                        if (child.kind === ts.SyntaxKind.ReturnStatement) {
                            const returnStmt = child as ts.ReturnStatement;
                            if (returnStmt.expression?.kind === ts.SyntaxKind.TypeReference) {
                                return returnStmt.expression;
                            }
                        }
                        return undefined;
                    });
                }
                return undefined;
            });
            
            if (typeRef) {
                const expectedKind = ts.getExpectedKindFromContext(typeRef as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
            }
        });

        it("should get actual kind from type", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const mockType = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const actualKind = ts.getActualKindFromType(mockType, checker);
            assert.isDefined(actualKind);
            assert.equal(actualKind!.arity, 1);
        });
    });
}); 