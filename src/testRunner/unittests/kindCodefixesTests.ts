import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindCodefixes", () => {
    describe("getExpectedKindFromContext", () => {
        it("should extract expected kind from type parameter constraints", () => {
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
                assert.equal(expectedKind!.arity, 2);
                assert.isTrue(expectedKind!.isValid);
            }
        });

        it("should extract expected kind from function declarations", () => {
            const sourceText = `
                function process<F extends Kind<Type>>(factory: F): F<string> {
                    return factory;
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
                const expectedKind = ts.getExpectedKindFromContext(funcDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.equal(expectedKind!.arity, 1);
            }
        });

        it("should extract expected kind from method declarations", () => {
            const sourceText = `
                class Container {
                    method<F extends Kind<Type, Type>>(factory: F): F<number> {
                        return factory;
                    }
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the method declaration
            const methodDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDecl = node as ts.ClassDeclaration;
                    return classDecl.members[0];
                }
                return undefined;
            });
            
            if (methodDecl) {
                const expectedKind = ts.getExpectedKindFromContext(methodDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.equal(expectedKind!.arity, 2);
            }
        });

        it("should extract expected kind from class declarations", () => {
            const sourceText = `
                class Box<F extends Kind<Type>> {
                    constructor(private factory: F) {}
                    
                    create(): F<string> {
                        return this.factory;
                    }
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the class declaration
            const classDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            if (classDecl) {
                const expectedKind = ts.getExpectedKindFromContext(classDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.equal(expectedKind!.arity, 1);
            }
        });

        it("should extract expected kind from interface declarations", () => {
            const sourceText = `
                interface Processor<F extends Kind<Type, Type, Type>> {
                    process(factory: F): F<number, string>;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the interface declaration
            const interfaceDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            if (interfaceDecl) {
                const expectedKind = ts.getExpectedKindFromContext(interfaceDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.equal(expectedKind!.arity, 3);
            }
        });

        it("should extract expected kind from type alias declarations", () => {
            const sourceText = `
                type Handler<F extends Kind<Type>> = (factory: F) => F<boolean>;
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the type alias declaration
            const typeAliasDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            if (typeAliasDecl) {
                const expectedKind = ts.getExpectedKindFromContext(typeAliasDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.equal(expectedKind!.arity, 1);
            }
        });

        it("should handle nodes without kind context", () => {
            const sourceText = `
                const x = 42;
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find a variable declaration
            const varDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.VariableStatement) {
                    return node;
                }
                return undefined;
            });
            
            if (varDecl) {
                const expectedKind = ts.getExpectedKindFromContext(varDecl as ts.TypeReferenceNode, checker);
                assert.isDefined(expectedKind);
                assert.isFalse(expectedKind!.isValid);
                assert.include(expectedKind!.errorMessage, "No constraint context found");
            }
        });
    });

    describe("getActualKindFromType", () => {
        it("should get kind metadata for kind type", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const kindType = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined,
                kindArity: 2,
                parameterKinds: [{ flags: 0x1 }, { flags: 0x1 }]
            } as any;
            
            const actualKind = ts.getActualKindFromType(kindType, checker);
            assert.isDefined(actualKind);
            assert.equal(actualKind!.arity, 2);
            assert.equal(actualKind!.parameterKinds.length, 2);
        });

        it("should handle non-kind types", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const nonKindType = {
                flags: 0x1, // TypeFlags.Any (not Kind)
                symbol: undefined
            } as any;
            
            const actualKind = ts.getActualKindFromType(nonKindType, checker);
            assert.isUndefined(actualKind);
        });

        it("should handle types without symbol", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const kindTypeWithoutSymbol = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const actualKind = ts.getActualKindFromType(kindTypeWithoutSymbol, checker);
            assert.isDefined(actualKind);
            assert.equal(actualKind!.arity, 1);
        });

        it("should handle types with missing kind properties", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const incompleteKindType = {
                flags: 0x80000000, // TypeFlags.Kind
                symbol: undefined
                // Missing kindArity and parameterKinds
            } as any;
            
            const actualKind = ts.getActualKindFromType(incompleteKindType, checker);
            assert.isUndefined(actualKind);
        });
    });

    describe("getNodeId", () => {
        it("should generate unique node IDs", () => {
            const sourceText = `
                function test<T extends Kind<Type>>(fa: T<number>): number {
                    return fa;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Get different nodes
            const funcDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            const typeParam = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    const funcDecl = node as ts.FunctionDeclaration;
                    return funcDecl.typeParameters?.[0];
                }
                return undefined;
            });
            
            if (funcDecl && typeParam) {
                const id1 = ts.getNodeId(funcDecl);
                const id2 = ts.getNodeId(typeParam);
                
                assert.isDefined(id1);
                assert.isDefined(id2);
                assert.notEqual(id1, id2);
            }
        });

        it("should handle different node types", () => {
            const sourceText = `
                interface Test<T> {
                    method(): T;
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Get different types of nodes
            const interfaceDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            const methodDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    const interfaceDecl = node as ts.InterfaceDeclaration;
                    return interfaceDecl.members[0];
                }
                return undefined;
            });
            
            if (interfaceDecl && methodDecl) {
                const id1 = ts.getNodeId(interfaceDecl);
                const id2 = ts.getNodeId(methodDecl);
                
                assert.isDefined(id1);
                assert.isDefined(id2);
                assert.notEqual(id1, id2);
            }
        });
    });

    describe("integration tests", () => {
        it("should work together for kind mismatch detection", () => {
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
                const nodeId = ts.getNodeId(typeRef);
                
                assert.isDefined(expectedKind);
                assert.isDefined(nodeId);
                assert.equal(expectedKind!.arity, 2);
            }
        });

        it("should handle complex kind scenarios", () => {
            const sourceText = `
                class Container<F extends Kind<Type, Type, Type>> {
                    constructor(private factory: F) {}
                    
                    create(): F<number, string, boolean> {
                        return this.factory;
                    }
                }
            `;
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            // Find the class declaration
            const classDecl = ts.forEachChild(sourceFile, node => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    return node;
                }
                return undefined;
            });
            
            if (classDecl) {
                const expectedKind = ts.getExpectedKindFromContext(classDecl as ts.TypeReferenceNode, checker);
                const nodeId = ts.getNodeId(classDecl);
                
                assert.isDefined(expectedKind);
                assert.isDefined(nodeId);
                assert.equal(expectedKind!.arity, 3);
            }
        });
    });
}); 