import {
    DiagnosticWithLocation,
    SourceFile,
    Node,
    Type,
    TypeChecker,
    KindMetadata,
    KindComparisonResult
} from "./types.js";
import { validateFPPatternKindConstraint } from "./kindAliasMetadata.js";
import { retrieveKindMetadata, getBuiltInAliasName } from "./kindMetadata.js";
import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";
import { createKindDiagnosticWithPosition } from "./kindDiagnosticPositionHelper.js";

export class KindDiagnosticReporter {
    private diagnostics: DiagnosticWithLocation[] = [];
    private checker: TypeChecker;

    constructor(checker: TypeChecker) {
        this.checker = checker;
    }

    /**
     * Get all reported diagnostics
     */
    getDiagnostics(): DiagnosticWithLocation[] {
        return this.diagnostics;
    }

    /**
     * Clear all diagnostics
     */
    clearDiagnostics(): void {
        this.diagnostics = [];
    }

    /**
     * Report FP pattern kind constraint violations with enhanced diagnostics
     */
    reportFPPatternKindConstraintViolation(
        patternName: string,
        typeArgument: Type,
        node: Node,
        sourceFile: SourceFile
    ): void {
        const typeSymbol = typeArgument.symbol;
        if (!typeSymbol) {
            this.reportGenericFPPatternViolation(patternName, "Type argument must be a type constructor", node, sourceFile);
            return;
        }

        const kindMetadata = retrieveKindMetadata(typeSymbol, this.checker);
        const actualKind = this.formatKindForDiagnostic(kindMetadata);

        let diagnosticCode: number;
        let message: string;

        if (patternName === "Free") {
            diagnosticCode = 9519;
            message = `The first type parameter of 'Free' must be a unary functor (Kind<Type, Type>). Found: ${actualKind}`;
        } else if (patternName === "Fix") {
            diagnosticCode = 9520;
            message = `The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: ${actualKind}`;
        } else {
            // Fallback to generic message
            diagnosticCode = 9518;
            message = `FP pattern '${patternName}' kind constraint violation: ${actualKind}`;
        }

        const diagnostic = createKindDiagnosticWithPosition(
            node,
            sourceFile,
            message,
            1, // Error
            applyKindDiagnosticAlias(diagnosticCode),
            "ts.plus"
        );
        
        // Add quick-fix suggestions
        diagnostic.relatedInformation = this.generateQuickFixSuggestions(patternName, typeArgument, node, sourceFile);

        this.diagnostics.push(diagnostic);
    }

    /**
     * Report generic FP pattern violation (fallback)
     */
    private reportGenericFPPatternViolation(
        patternName: string,
        constraintDescription: string,
        node: Node,
        sourceFile: SourceFile
    ): void {
        const diagnostic: DiagnosticWithLocation = {
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile),
            messageText: `FP pattern '${patternName}' kind constraint violation: ${constraintDescription}`,
            category: 1, // Error
            code: applyKindDiagnosticAlias(9518),
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus",
            relatedInformation: this.generateQuickFixSuggestions(patternName, undefined, node, sourceFile)
        };
        this.diagnostics.push(diagnostic);
    }

    /**
     * Generate quick-fix suggestions for FP pattern violations
     */
    private generateQuickFixSuggestions(
        patternName: string,
        typeArgument: Type | undefined,
        node: Node,
        sourceFile: SourceFile
    ): any[] {
        const suggestions: any[] = [];

        // Suggestion 1: Change type parameter to Functor
        suggestions.push({
            category: 2, // Message
            code: 9521,
            messageText: "Change type parameter to Functor",
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile)
        });

        // Suggestion 2: Wrap type in Functor<...>
        if (typeArgument) {
            const typeName = this.getTypeName(typeArgument);
            suggestions.push({
                category: 2, // Message
                code: 9522,
                messageText: `Wrap type in Functor<${typeName}>`,
                file: sourceFile,
                start: node.getStart(sourceFile),
                length: node.getWidth(sourceFile)
            });
        }

        // Suggestion 3: Replace with known functor
        suggestions.push({
            category: 2, // Message
            code: 9523,
            messageText: "Replace with known functor",
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile)
        });

        return suggestions;
    }

    /**
     * Format kind metadata for diagnostic display
     */
    private formatKindForDiagnostic(kindMetadata: KindMetadata): string {
        if (!kindMetadata.isValid) {
            return "invalid kind";
        }

        if (kindMetadata.isBuiltInAlias && kindMetadata.aliasName) {
            return kindMetadata.aliasName;
        }

        return `Kind<${kindMetadata.parameterKinds.map(k => this.getTypeName(k)).join(", ")}>`;
    }

    /**
     * Get a readable name for a type
     */
    private getTypeName(type: Type): string {
        if (type.symbol) {
            return (type.symbol as any).name || "unknown";
        }
        return "unknown";
    }

    /**
     * Validate and report FP pattern kind constraints
     */
    validateAndReportFPPatternConstraint(
        patternName: string,
        typeArgument: Type,
        node: Node,
        sourceFile: SourceFile
    ): boolean {
        const validationResult = validateFPPatternKindConstraint(
            patternName,
            typeArgument,
            this.checker
        );

        if (!validationResult.isValid) {
            this.reportFPPatternKindConstraintViolation(
                patternName,
                typeArgument,
                node,
                sourceFile
            );
            return false;
        }
        return true;
    }

    /**
     * Report kind compatibility issues
     */
    reportKindCompatibilityIssue(
        expectedKind: KindMetadata,
        actualKind: KindMetadata,
        node: Node,
        sourceFile: SourceFile
    ): void {
        const diagnostic: DiagnosticWithLocation = {
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile),
            messageText: `Expected kind ${this.formatKindForDiagnostic(expectedKind)}, but got ${this.formatKindForDiagnostic(actualKind)}`,
            category: 1, // Error
            code: 9512, // Type parameter violates kind constraint
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        };
        this.diagnostics.push(diagnostic);
    }

    /**
     * Report kind comparison results
     */
    reportKindComparisonResult(
        result: KindComparisonResult,
        node: Node,
        sourceFile: SourceFile
    ): void {
        if (result.errors.length > 0) {
            for (const error of result.errors) {
                const diagnostic: DiagnosticWithLocation = {
                    file: sourceFile,
                    start: node.getStart(sourceFile),
                    length: node.getWidth(sourceFile),
                    messageText: error.message,
                    category: 1, // Error
                    code: 9512, // Type parameter violates kind constraint
                    reportsUnnecessary: false,
                    reportsDeprecated: false,
                    source: "ts.plus"
                };
                this.diagnostics.push(diagnostic);
            }
        }

        if (result.warnings.length > 0) {
            for (const warning of result.warnings) {
                const diagnostic: DiagnosticWithLocation = {
                    file: sourceFile,
                    start: node.getStart(sourceFile),
                    length: node.getWidth(sourceFile),
                    messageText: warning.message,
                    category: 2, // Warning
                    code: 9512,
                    reportsUnnecessary: false,
                    reportsDeprecated: false,
                    source: "ts.plus"
                };
                this.diagnostics.push(diagnostic);
            }
        }
    }
} 