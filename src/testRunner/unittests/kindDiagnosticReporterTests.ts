import * as ts from "../_namespaces/ts.js";

describe("unittests:: kindDiagnosticReporter", () => {
    describe("offset to position conversion", () => {
        it("should handle single line source files", () => {
            const sourceText = "const x = 42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test various positions on single line
            assert.equal(ts.getLineFromOffset(sourceFile, 0), 1);
            assert.equal(ts.getLineFromOffset(sourceFile, 5), 1);
            assert.equal(ts.getLineFromOffset(sourceFile, sourceText.length - 1), 1);
            
            assert.equal(ts.getColumnFromOffset(sourceFile, 0), 1);
            assert.equal(ts.getColumnFromOffset(sourceFile, 5), 6);
            assert.equal(ts.getColumnFromOffset(sourceFile, sourceText.length - 1), sourceText.length);
        });

        it("should handle multi-line source files", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test line boundaries
            assert.equal(ts.getLineFromOffset(sourceFile, 0), 1);   // Start of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 5), 1);   // End of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 6), 2);   // Start of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 11), 2);  // End of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 12), 3);  // Start of line3
            assert.equal(ts.getLineFromOffset(sourceFile, 17), 3);  // End of line3
        });

        it("should handle empty lines", () => {
            const sourceText = "line1\n\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.equal(ts.getLineFromOffset(sourceFile, 0), 1);   // Start of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 5), 1);   // End of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 6), 2);   // Empty line
            assert.equal(ts.getLineFromOffset(sourceFile, 7), 3);   // Start of line3
        });

        it("should handle Windows line endings", () => {
            const sourceText = "line1\r\nline2\r\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.equal(ts.getLineFromOffset(sourceFile, 0), 1);   // Start of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 5), 1);   // End of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 7), 2);   // Start of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 12), 2);  // End of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 14), 3);  // Start of line3
        });

        it("should handle mixed line endings", () => {
            const sourceText = "line1\nline2\r\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.equal(ts.getLineFromOffset(sourceFile, 0), 1);   // Start of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 5), 1);   // End of line1
            assert.equal(ts.getLineFromOffset(sourceFile, 6), 2);   // Start of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 11), 2);  // End of line2
            assert.equal(ts.getLineFromOffset(sourceFile, 13), 3);  // Start of line3
        });
    });

    describe("column calculation", () => {
        it("should calculate columns correctly for single line", () => {
            const sourceText = "const x = 42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.equal(ts.getColumnFromOffset(sourceFile, 0), 1);   // 'c'
            assert.equal(ts.getColumnFromOffset(sourceFile, 1), 2);   // 'o'
            assert.equal(ts.getColumnFromOffset(sourceFile, 5), 6);   // 'x'
            assert.equal(ts.getColumnFromOffset(sourceFile, 9), 10);  // '4'
            assert.equal(ts.getColumnFromOffset(sourceFile, 11), 12); // ';'
        });

        it("should calculate columns correctly for multi-line", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Line 1
            assert.equal(ts.getColumnFromOffset(sourceFile, 0), 1);   // Start of line1
            assert.equal(ts.getColumnFromOffset(sourceFile, 4), 5);   // End of line1
            
            // Line 2
            assert.equal(ts.getColumnFromOffset(sourceFile, 6), 1);   // Start of line2
            assert.equal(ts.getColumnFromOffset(sourceFile, 10), 5);  // End of line2
            
            // Line 3
            assert.equal(ts.getColumnFromOffset(sourceFile, 12), 1);  // Start of line3
            assert.equal(ts.getColumnFromOffset(sourceFile, 16), 5);  // End of line3
        });

        it("should handle tabs and special characters", () => {
            const sourceText = "\tconst\tx\t=\t42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.equal(ts.getColumnFromOffset(sourceFile, 0), 1);   // Tab
            assert.equal(ts.getColumnFromOffset(sourceFile, 1), 2);   // 'c'
            assert.equal(ts.getColumnFromOffset(sourceFile, 6), 7);   // Tab
            assert.equal(ts.getColumnFromOffset(sourceFile, 7), 8);   // 'x'
        });
    });

    describe("position conversion", () => {
        it("should convert offset to position correctly", () => {
            const sourceText = "line1\nline2\nline3";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test various positions
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 0), { line: 1, column: 1 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 3), { line: 1, column: 4 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 6), { line: 2, column: 1 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 8), { line: 2, column: 3 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 12), { line: 3, column: 1 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 15), { line: 3, column: 4 });
        });

        it("should handle edge cases", () => {
            const sourceText = "x";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 0), { line: 1, column: 1 });
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 1), { line: 1, column: 2 });
        });

        it("should handle empty source file", () => {
            const sourceText = "";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            assert.deepEqual(ts.getPositionFromOffset(sourceFile, 0), { line: 1, column: 1 });
        });
    });

    describe("KindDiagnosticReporter class", () => {
        it("should create reporter instance", () => {
            const program = ts.createProgram(["test.ts"], {});
            const reporter = ts.createKindDiagnosticReporter(program);
            
            assert.isDefined(reporter);
            assert.isFunction(reporter.getLineFromOffset);
            assert.isFunction(reporter.getColumnFromOffset);
            assert.isFunction(reporter.getPositionFromOffset);
        });

        it("should use reporter methods correctly", () => {
            const sourceText = "const x = 42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const reporter = ts.createKindDiagnosticReporter(program);
            
            // Test reporter methods
            assert.equal(reporter.getLineFromOffset(sourceFile, 5), 1);
            assert.equal(reporter.getColumnFromOffset(sourceFile, 5), 6);
            assert.deepEqual(reporter.getPositionFromOffset(sourceFile, 5), { line: 1, column: 6 });
        });

        it("should handle diagnostic creation", () => {
            const sourceText = "function test<T extends Kind<Type>>(fa: T<number>): number { return fa; }";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            const program = ts.createProgram(["test.ts"], {});
            const reporter = ts.createKindDiagnosticReporter(program);
            
            // Test creating a diagnostic with proper position information
            const violation = {
                typeParameterName: "T",
                expectedKind: { arity: 2, parameterKinds: [] },
                actualKind: { arity: 1, parameterKinds: [] },
                errors: [{ message: "Arity mismatch" }]
            };
            
            const diagnostic = ts.createKindConstraintViolationDiagnostic(violation, sourceFile, program.getTypeChecker());
            
            assert.equal(diagnostic.code, "TypeParameterKindConstraintViolation");
            assert.equal(diagnostic.category, "Error");
            assert.include(diagnostic.message, "Type parameter 'T' violates kind constraint");
            assert.equal(diagnostic.file, sourceFile);
            assert.equal(diagnostic.start, 0);
            assert.equal(diagnostic.length, sourceText.length);
        });
    });

    describe("error handling", () => {
        it("should handle invalid offsets gracefully", () => {
            const sourceText = "const x = 42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test with offset beyond source length
            const largeOffset = sourceText.length + 100;
            assert.equal(ts.getLineFromOffset(sourceFile, largeOffset), 1);
            assert.equal(ts.getColumnFromOffset(sourceFile, largeOffset), sourceText.length + 1);
        });

        it("should handle negative offsets", () => {
            const sourceText = "const x = 42;";
            const sourceFile = ts.createSourceFile("test.ts", sourceText, ts.ScriptTarget.Latest);
            
            // Test with negative offset
            assert.equal(ts.getLineFromOffset(sourceFile, -1), 1);
            assert.equal(ts.getColumnFromOffset(sourceFile, -1), 1);
        });
    });
}); 