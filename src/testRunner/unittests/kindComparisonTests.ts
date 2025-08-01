import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindComparison", () => {
    describe("compareKindTypes", () => {
        it("should compare identical kind types successfully", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const kind1 = {
                flags: 0x80000000, // TypeFlags.Kind
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const kind2 = {
                flags: 0x80000000, // TypeFlags.Kind
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(kind1, kind2, checker, false);
            assert.isTrue(result.isCompatible);
            assert.equal(result.errors.length, 0);
        });

        it("should detect arity mismatch", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const expectedKind = {
                flags: 0x80000000,
                kindArity: 2,
                parameterKinds: []
            } as any;
            
            const actualKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(expectedKind, actualKind, checker, false);
            assert.isFalse(result.isCompatible);
            assert.isTrue(result.errors.length > 0);
            assert.include(result.errors[0].message, "arity");
        });

        it("should detect parameter kind mismatch", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const expectedKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x1 }] // TypeFlags.Any
            } as any;
            
            const actualKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x2 }] // Different type flag
            } as any;
            
            const result = ts.compareKindTypes(expectedKind, actualKind, checker, false);
            assert.isFalse(result.isCompatible);
            assert.isTrue(result.errors.length > 0);
        });

        it("should handle nested kind types", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const nestedKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{
                    flags: 0x80000000,
                    kindArity: 0,
                    parameterKinds: []
                }]
            } as any;
            
            const simpleKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x1 }]
            } as any;
            
            const result = ts.compareKindTypes(nestedKind, simpleKind, checker, false);
            assert.isFalse(result.isCompatible);
        });

        it("should handle debug mode", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const kind1 = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const kind2 = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(kind1, kind2, checker, true);
            assert.isTrue(result.isCompatible);
            assert.equal(result.errors.length, 0);
        });

        it("should handle non-kind types", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const nonKindType = {
                flags: 0x1, // TypeFlags.Any (not Kind)
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const kindType = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(kindType, nonKindType, checker, false);
            assert.isFalse(result.isCompatible);
        });
    });

    describe("isTypeType", () => {
        it("should identify Type type correctly", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const typeType = {
                flags: 0x1, // TypeFlags.Any (placeholder for Type)
                symbol: undefined
            } as any;
            
            const result = ts.isTypeType(typeType, checker);
            assert.isTrue(result);
        });

        it("should reject non-Type types", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const nonTypeType = {
                flags: 0x2, // Different flag
                symbol: undefined
            } as any;
            
            const result = ts.isTypeType(nonTypeType, checker);
            assert.isFalse(result);
        });

        it("should handle undefined type", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const result = ts.isTypeType(undefined, checker);
            assert.isFalse(result);
        });
    });

    describe("complex kind comparisons", () => {
        it("should compare higher-order kinds", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const higherOrderKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{
                    flags: 0x80000000,
                    kindArity: 1,
                    parameterKinds: []
                }]
            } as any;
            
            const simpleKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x1 }]
            } as any;
            
            const result = ts.compareKindTypes(higherOrderKind, simpleKind, checker, false);
            assert.isFalse(result.isCompatible);
        });

        it("should handle multiple parameter kinds", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const multiParamKind = {
                flags: 0x80000000,
                kindArity: 2,
                parameterKinds: [
                    { flags: 0x1 }, // TypeFlags.Any
                    { flags: 0x1 }  // TypeFlags.Any
                ]
            } as any;
            
            const singleParamKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x1 }]
            } as any;
            
            const result = ts.compareKindTypes(multiParamKind, singleParamKind, checker, false);
            assert.isFalse(result.isCompatible);
        });

        it("should handle empty parameter kinds", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const emptyParamKind = {
                flags: 0x80000000,
                kindArity: 0,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(emptyParamKind, emptyParamKind, checker, false);
            assert.isTrue(result.isCompatible);
            assert.equal(result.errors.length, 0);
        });
    });

    describe("error reporting", () => {
        it("should provide detailed error messages", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const expectedKind = {
                flags: 0x80000000,
                kindArity: 2,
                parameterKinds: [{ flags: 0x1 }, { flags: 0x1 }]
            } as any;
            
            const actualKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x2 }]
            } as any;
            
            const result = ts.compareKindTypes(expectedKind, actualKind, checker, false);
            assert.isFalse(result.isCompatible);
            assert.isTrue(result.errors.length > 0);
            
            // Check that error messages are descriptive
            const errorMessages = result.errors.map(e => e.message);
            assert.isTrue(errorMessages.some(msg => msg.includes("arity")));
        });

        it("should handle multiple errors", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const expectedKind = {
                flags: 0x80000000,
                kindArity: 2,
                parameterKinds: [{ flags: 0x1 }, { flags: 0x1 }]
            } as any;
            
            const actualKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: [{ flags: 0x2 }]
            } as any;
            
            const result = ts.compareKindTypes(expectedKind, actualKind, checker, false);
            assert.isFalse(result.isCompatible);
            assert.isTrue(result.errors.length >= 1);
        });
    });

    describe("edge cases", () => {
        it("should handle null/undefined kinds", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const validKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result1 = ts.compareKindTypes(validKind, undefined, checker, false);
            assert.isFalse(result1.isCompatible);
            
            const result2 = ts.compareKindTypes(undefined, validKind, checker, false);
            assert.isFalse(result2.isCompatible);
        });

        it("should handle kinds with missing properties", () => {
            const program = ts.createProgram(["test.ts"], {});
            const checker = program.getTypeChecker();
            
            const incompleteKind = {
                flags: 0x80000000
                // Missing kindArity and parameterKinds
            } as any;
            
            const completeKind = {
                flags: 0x80000000,
                kindArity: 1,
                parameterKinds: []
            } as any;
            
            const result = ts.compareKindTypes(completeKind, incompleteKind, checker, false);
            assert.isFalse(result.isCompatible);
        });
    });
}); 