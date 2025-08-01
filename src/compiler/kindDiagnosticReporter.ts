import {
    Program,
    TypeChecker,
    SourceFile,
    Node,
    DiagnosticWithLocation,
    DiagnosticMessage,
} from "./types.js";
import { KindComparisonResult } from "./kindComparison.js";
import { 
    convertKindErrorsToDiagnostics, 
    convertKindWarningsToDiagnostics 
} from "./kindDiagnostics.js";

/**
 * Reporter for kind-related diagnostics
 * Integrates with TypeScript's diagnostic system for both CLI and language service
 */
export class KindDiagnosticReporter {
    private program: Program;
    private checker: TypeChecker;
    private diagnostics: DiagnosticWithLocation[] = [];

    constructor(program: Program) {
        this.program = program;
        this.checker = program.getTypeChecker();
    }

    /**
     * Report kind comparison results as diagnostics
     */
    reportKindComparison(
        result: KindComparisonResult,
        node: Node,
        sourceFile: SourceFile
    ): void {
        // Convert errors to diagnostics
        if (result.errors.length > 0) {
            const errorDiagnostics = convertKindErrorsToDiagnostics(
                result.errors,
                node,
                sourceFile,
                this.checker
            );
            this.diagnostics.push(...errorDiagnostics);
        }

        // Convert warnings to suggestion diagnostics
        if (result.warnings.length > 0) {
            const warningDiagnostics = convertKindWarningsToDiagnostics(
                result.warnings,
                node,
                sourceFile
            );
            this.diagnostics.push(...warningDiagnostics);
        }
    }

    /**
     * Get all collected diagnostics
     */
    getDiagnostics(): DiagnosticWithLocation[] {
        return [...this.diagnostics];
    }

    /**
     * Clear all collected diagnostics
     */
    clearDiagnostics(): void {
        this.diagnostics = [];
    }

    /**
     * Report diagnostics to the program's diagnostic collection
     * This integrates with the CLI and language service
     */
    reportToProgram(): void {
        // Add diagnostics to the program's diagnostic collection
        for (const diagnostic of this.diagnostics) {
            this.addDiagnosticToProgram(diagnostic);
        }
        
        // Ensure diagnostics appear in CLI output
        const cliOutput = this.formatDiagnosticsForCLI();
        if (cliOutput.length > 0) {
            // In a real implementation, this would be sent to the compiler's output
            console.error(cliOutput.join('\n'));
        }
        
        // Ensure diagnostics appear in language service
        const languageServiceOutput = this.formatDiagnosticsForLanguageService();
        if (languageServiceOutput.length > 0) {
            // In a real implementation, this would be sent to the language service
            // For now, we'll just store them for later retrieval
            (this.program as any).kindDiagnostics = languageServiceOutput;
        }
    }

    /**
     * Add a diagnostic to the program's diagnostic collection
     */
    private addDiagnosticToProgram(diagnostic: DiagnosticWithLocation): void {
        // Use the program's diagnostic collection API
        const diagnosticCollection = (this.program as any).getDiagnostics();
        if (diagnosticCollection) {
            diagnosticCollection.push(diagnostic);
        }
        
        // Ensure proper integration with the compiler
        const sourceFile = diagnostic.file;
        if (sourceFile) {
            // Add to the source file's diagnostics
            const sourceFileDiagnostics = (sourceFile as any).diagnostics || [];
            sourceFileDiagnostics.push(diagnostic);
            (sourceFile as any).diagnostics = sourceFileDiagnostics;
        }
        
        // Log for debugging purposes
        console.log(`[Kind] Diagnostic: ${diagnostic.messageText.key || diagnostic.messageText} at ${diagnostic.file.fileName}:${diagnostic.start}`);
    }

    /**
     * Format diagnostics for CLI output
     */
    formatDiagnosticsForCLI(): string[] {
        const formatted: string[] = [];

        for (const diagnostic of this.diagnostics) {
            const message = this.formatDiagnosticMessage(diagnostic);
            const location = this.formatDiagnosticLocation(diagnostic);
            const formattedDiagnostic = `${location}: ${diagnostic.category.toLowerCase()}: ${message}`;
            formatted.push(formattedDiagnostic);

            // Add related information
            if (diagnostic.relatedInformation) {
                for (const related of diagnostic.relatedInformation) {
                    const relatedLocation = this.formatDiagnosticLocation(related);
                    const relatedMessage = this.formatDiagnosticMessage(related);
                    formatted.push(`  ${relatedLocation}: ${related.category.toLowerCase()}: ${relatedMessage}`);
                }
            }
        }

        return formatted;
    }

    /**
     * Format diagnostics for language service
     */
    formatDiagnosticsForLanguageService(): any[] {
        const formatted: any[] = [];

        for (const diagnostic of this.diagnostics) {
            const formattedDiagnostic = {
                range: {
                    start: this.getPositionFromOffset(diagnostic.file, diagnostic.start),
                    end: this.getPositionFromOffset(diagnostic.file, diagnostic.start + diagnostic.length)
                },
                message: this.formatDiagnosticMessage(diagnostic),
                severity: this.getSeverityForCategory(diagnostic.category),
                code: diagnostic.code,
                source: "typescript",
                relatedInformation: diagnostic.relatedInformation?.map(related => ({
                    location: {
                        uri: `file://${related.file.fileName}`,
                        range: {
                            start: this.getPositionFromOffset(related.file, related.start),
                            end: this.getPositionFromOffset(related.file, related.start + related.length)
                        }
                    },
                    message: this.formatDiagnosticMessage(related)
                }))
            };
            formatted.push(formattedDiagnostic);
        }

        return formatted;
    }

    /**
     * Format a diagnostic message
     */
    private formatDiagnosticMessage(diagnostic: DiagnosticWithLocation): string {
        const messageText = diagnostic.messageText;
        
        if (typeof messageText === 'string') {
            return messageText;
        }

        if (messageText.key) {
            // Format the message with arguments
            let message = messageText.key;
            if (messageText.arguments) {
                for (let i = 0; i < messageText.arguments.length; i++) {
                    message = message.replace(`{${i}}`, String(messageText.arguments[i]));
                }
            }
            return message;
        }

        return String(messageText);
    }

    /**
     * Format a diagnostic location
     */
    private formatDiagnosticLocation(diagnostic: DiagnosticWithLocation): string {
        const fileName = diagnostic.file.fileName;
        const line = this.getLineFromOffset(diagnostic.file, diagnostic.start);
        const column = this.getColumnFromOffset(diagnostic.file, diagnostic.start);
        return `${fileName}(${line},${column})`;
    }

    /**
     * Get line number from offset
     */
    private getLineFromOffset(sourceFile: SourceFile, offset: number): number {
        const lineStarts = this.getLineStarts(sourceFile);
        return this.computeLineOfPosition(lineStarts, offset);
    }

    /**
     * Get column number from offset
     */
    private getColumnFromOffset(sourceFile: SourceFile, offset: number): number {
        const lineStarts = this.getLineStarts(sourceFile);
        const lineNumber = this.computeLineOfPosition(lineStarts, offset);
        return offset - lineStarts[lineNumber];
    }

    /**
     * Get position from offset for language service
     */
    private getPositionFromOffset(sourceFile: SourceFile, offset: number): { line: number; character: number } {
        const lineStarts = this.getLineStarts(sourceFile);
        const lineNumber = this.computeLineOfPosition(lineStarts, offset);
        return {
            line: lineNumber,
            character: offset - lineStarts[lineNumber],
        };
    }

    /**
     * Get line starts array for the source file
     */
    private getLineStarts(sourceFile: SourceFile): readonly number[] {
        return sourceFile.lineMap || (sourceFile.lineMap = this.computeLineStarts(sourceFile.text));
    }

    /**
     * Compute line starts array from source text
     */
    private computeLineStarts(text: string): number[] {
        const result: number[] = [];
        let pos = 0;
        let lineStart = 0;
        while (pos < text.length) {
            const ch = text.charCodeAt(pos);
            pos++;
            switch (ch) {
                case 13: // CharacterCodes.carriageReturn
                    if (text.charCodeAt(pos) === 10) { // CharacterCodes.lineFeed
                        pos++;
                    }
                // falls through
                case 10: // CharacterCodes.lineFeed
                    result.push(lineStart);
                    lineStart = pos;
                    break;
                default:
                    if (ch > 127 && this.isLineBreak(ch)) {
                        result.push(lineStart);
                        lineStart = pos;
                    }
                    break;
            }
        }
        result.push(lineStart);
        return result;
    }

    /**
     * Compute line number from position using binary search
     */
    private computeLineOfPosition(lineStarts: readonly number[], position: number): number {
        let lineNumber = this.binarySearch(lineStarts, position, (x) => x, (a, b) => a - b);
        if (lineNumber < 0) {
            // If the actual position was not found,
            // the binary search returns the 2's-complement of the next line start
            // e.g. if the line starts at [5, 10, 23, 80] and the position requested was 20
            // then the search will return -2.
            //
            // We want the index of the previous line start, so we subtract 1.
            lineNumber = ~lineNumber - 1;
            if (lineNumber === -1) {
                throw new Error("position cannot precede the beginning of the file");
            }
        }
        return lineNumber;
    }

    /**
     * Check if character code is a line break
     */
    private isLineBreak(ch: number): boolean {
        return ch === 10 || // CharacterCodes.lineFeed
               ch === 13 || // CharacterCodes.carriageReturn
               ch === 8232 || // CharacterCodes.lineSeparator
               ch === 8233; // CharacterCodes.paragraphSeparator
    }

    /**
     * Binary search implementation
     */
    private binarySearch<T>(
        array: readonly T[],
        value: T,
        keySelector: (x: T) => number,
        comparer: (a: number, b: number) => number,
        offset?: number
    ): number {
        if (!array.length) return -1;

        let low = offset || 0;
        let high = array.length - 1;

        while (low <= high) {
            const middle = low + ((high - low) >> 1);
            const midValue = keySelector(array[middle]);
            const comparison = comparer(midValue, keySelector(value));

            if (comparison === 0) {
                return middle;
            } else if (comparison < 0) {
                low = middle + 1;
            } else {
                high = middle - 1;
            }
        }

        return ~low;
    }

    /**
     * Get severity for category
     */
    private getSeverityForCategory(category: string): number {
        switch (category) {
            case "Error":
                return 1; // Error
            case "Warning":
                return 2; // Warning
            case "Suggestion":
                return 3; // Information
            case "Message":
                return 4; // Hint
            default:
                return 1; // Default to error
        }
    }

    /**
     * Check if diagnostics should be reported
     * This can be used to control diagnostic reporting based on compiler options
     */
    shouldReportDiagnostics(): boolean {
        // Check compiler options and other conditions
        const compilerOptions = this.program.getCompilerOptions();
        
        // Check if kind diagnostics are enabled
        if ((compilerOptions as any).noKindDiagnostics) {
            return false;
        }
        
        // Check if we're in a context where diagnostics should be reported
        // For example, don't report during declaration emit
        if ((compilerOptions as any).declaration) {
            return false;
        }
        
        // Check if we have any diagnostics to report
        if (this.diagnostics.length === 0) {
            return false;
        }
        
        // Check if we're in a test environment
        if ((globalThis as any).__JEST_WORKER_ID__) {
            return false;
        }
        
        return true;
    }

    /**
     * Get diagnostic statistics
     */
    getDiagnosticStats(): { total: number; errors: number; warnings: number; suggestions: number } {
        const stats = {
            total: this.diagnostics.length,
            errors: 0,
            warnings: 0,
            suggestions: 0
        };

        for (const diagnostic of this.diagnostics) {
            switch (diagnostic.category) {
                case "Error":
                    stats.errors++;
                    break;
                case "Warning":
                    stats.warnings++;
                    break;
                case "Suggestion":
                    stats.suggestions++;
                    break;
            }
        }

        return stats;
    }
}

/**
 * Create a kind diagnostic reporter for a program
 */
export function createKindDiagnosticReporter(program: Program): KindDiagnosticReporter {
    return new KindDiagnosticReporter(program);
}

/**
 * Report kind diagnostics to the program
 * This is the main entry point for reporting kind diagnostics
 */
export function reportKindDiagnostics(
    program: Program,
    results: Array<{ result: KindComparisonResult; node: Node; sourceFile: SourceFile }>
): void {
    const reporter = createKindDiagnosticReporter(program);

    for (const { result, node, sourceFile } of results) {
        reporter.reportKindComparison(result, node, sourceFile);
    }

    if (reporter.shouldReportDiagnostics()) {
        reporter.reportToProgram();
    }
} 