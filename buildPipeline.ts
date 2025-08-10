/**
 * Build Pipeline Integration
 * 
 * Hooks the FRP fusion transformer into the TypeScript compilation process
 * via ttypescript or ts-patch, enabling compile-time fusion optimization.
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

import { 
  createFRPFusionTransformer,
  defaultConfig,
  FusionTransformerConfig
} from './frpFusionTransformer';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Build configuration
 */
export interface BuildConfig {
  inputDir: string;
  outputDir: string;
  transformerConfig: FusionTransformerConfig;
  compilerOptions: ts.CompilerOptions;
  includePatterns: string[];
  excludePatterns: string[];
  sourceMap: boolean;
  declaration: boolean;
  watch: boolean;
  verbose: boolean;
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  filesProcessed: number;
  filesTransformed: number;
  errors: ts.Diagnostic[];
  warnings: ts.Diagnostic[];
  performance: {
    totalTime: number;
    transformationTime: number;
    compilationTime: number;
  };
}

/**
 * Transformer plugin configuration for ttypescript
 */
export interface TransformerPlugin {
  before?: ts.TransformerFactory<ts.SourceFile>;
  after?: ts.TransformerFactory<ts.SourceFile>;
  afterDeclarations?: ts.TransformerFactory<ts.Bundle | ts.SourceFile>;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default build configuration
 */
export function defaultBuildConfig(): BuildConfig {
  return {
    inputDir: './src',
    outputDir: './dist',
    transformerConfig: defaultConfig(),
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      sourceMap: true,
      outDir: './dist',
      rootDir: './src'
    },
    includePatterns: ['**/*.ts'],
    excludePatterns: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts', 'node_modules/**'],
    sourceMap: true,
    declaration: true,
    watch: false,
    verbose: false
  };
}

/**
 * Production build configuration
 */
export function productionBuildConfig(): BuildConfig {
  const config = defaultBuildConfig();
  config.transformerConfig.enableStatelessFusion = true;
  config.transformerConfig.enableStatefulFusion = true;
  config.transformerConfig.enableLambdaInlining = true;
  config.transformerConfig.debugMode = false;
  config.compilerOptions.sourceMap = false;
  config.compilerOptions.declaration = false;
  return config;
}

/**
 * Development build configuration
 */
export function developmentBuildConfig(): BuildConfig {
  const config = defaultBuildConfig();
  config.transformerConfig.debugMode = true;
  config.sourceMap = true;
  config.declaration = true;
  config.verbose = true;
  return config;
}

// ============================================================================
// File Discovery and Filtering
// ============================================================================

/**
 * Discover TypeScript files in directory
 */
export function discoverTypeScriptFiles(
  inputDir: string,
  includePatterns: string[],
  excludePatterns: string[]
): string[] {
  const files: string[] = [];
  
  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        const relativePath = path.relative(inputDir, fullPath);
        const isExcluded = excludePatterns.some(pattern => 
          minimatch(relativePath, pattern) || minimatch(entry.name, pattern)
        );
        
        if (!isExcluded) {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        // Check if file matches include patterns
        const relativePath = path.relative(inputDir, fullPath);
        const isIncluded = includePatterns.some(pattern => 
          minimatch(relativePath, pattern)
        );
        
        if (isIncluded) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir(inputDir);
  return files;
}

/**
 * Simple glob pattern matching (minimal implementation)
 */
function minimatch(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\*\*/g, '.*');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

// ============================================================================
// Transformer Integration
// ============================================================================

/**
 * Create transformer plugin for ttypescript
 */
export function createTransformerPlugin(config: FusionTransformerConfig): TransformerPlugin {
  return {
    before: createFRPFusionTransformer(config)
  };
}

/**
 * Create custom compiler host with transformer
 */
export function createCompilerHostWithTransformer(
  config: BuildConfig,
  transformer: ts.TransformerFactory<ts.SourceFile>
): ts.CompilerHost {
  const baseHost = ts.createCompilerHost(config.compilerOptions);
  
  return {
    ...baseHost,
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
      const sourceFile = baseHost.getSourceFile(fileName, languageVersion);
      
      if (!sourceFile) return sourceFile;
      
      // Apply transformer
      const context: ts.TransformationContext = {
        factory: ts.factory,
        getCompilerOptions: () => config.compilerOptions,
        hoistVariableDeclaration: () => {},
        hoistFunctionDeclaration: () => {},
        readEmitHelper: () => undefined,
        emitEmitHelper: () => {},
        startLexicalEnvironment: () => {},
        suspendLexicalEnvironment: () => {},
        resumeLexicalEnvironment: () => {},
        endLexicalEnvironment: () => {},
        setLexicalEnvironmentFlags: () => {},
        getLexicalEnvironmentFlags: () => 0,
        setEmitFlags: () => {},
        getEmitFlags: () => 0,
        setEmitNode: () => {},
        getEmitNode: () => undefined,
        addEmitHelper: () => {},
        removeEmitHelper: () => {},
        isEmitHelperEnabled: () => true,
        isSubstitutionEnabled: () => false,
        onEmitNode: () => {},
        onSubstituteNode: () => undefined,
        enableEmitNotification: () => {},
        enableSubstitution: () => {},
        isEmitNotificationEnabled: () => false,
        isSubstitutionEnabled: () => false
      };
      
      return transformer(context)(sourceFile) as ts.SourceFile;
    }
  };
}

// ============================================================================
// Build Process
// ============================================================================

/**
 * Build TypeScript project with FRP fusion transformer
 */
export async function buildProject(config: BuildConfig): Promise<BuildResult> {
  const startTime = performance.now();
  const errors: ts.Diagnostic[] = [];
  const warnings: ts.Diagnostic[] = [];
  
  try {
    // Discover TypeScript files
    const files = discoverTypeScriptFiles(
      config.inputDir,
      config.includePatterns,
      config.excludePatterns
    );
    
    if (config.verbose) {
      console.log(`[Build] Found ${files.length} TypeScript files`);
    }
    
    // Create transformer
    const transformer = createFRPFusionTransformer(config.transformerConfig);
    
    // Create compiler host with transformer
    const compilerHost = createCompilerHostWithTransformer(config, transformer);
    
    // Create program
    const program = ts.createProgram(files, config.compilerOptions, compilerHost);
    
    // Get diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);
    
    // Separate errors and warnings
    for (const diagnostic of diagnostics) {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push(diagnostic);
      } else {
        warnings.push(diagnostic);
      }
    }
    
    // Check for errors
    if (errors.length > 0) {
      return {
        success: false,
        filesProcessed: files.length,
        filesTransformed: 0,
        errors,
        warnings,
        performance: {
          totalTime: performance.now() - startTime,
          transformationTime: 0,
          compilationTime: 0
        }
      };
    }
    
    // Emit files
    const emitResult = program.emit();
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    if (config.verbose) {
      console.log(`[Build] Emitted ${emitResult.diagnostics.length} diagnostics`);
      console.log(`[Build] Build completed in ${totalTime.toFixed(2)}ms`);
    }
    
    return {
      success: true,
      filesProcessed: files.length,
      filesTransformed: files.length, // All files are transformed
      errors: [],
      warnings: emitResult.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Warning),
      performance: {
        totalTime,
        transformationTime: totalTime * 0.3, // Estimate
        compilationTime: totalTime * 0.7 // Estimate
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    
    return {
      success: false,
      filesProcessed: 0,
      filesTransformed: 0,
      errors: [{
        category: ts.DiagnosticCategory.Error,
        code: 9999,
        messageText: error instanceof Error ? error.message : String(error),
        file: undefined,
        start: undefined,
        length: undefined
      }],
      warnings: [],
      performance: {
        totalTime: endTime - startTime,
        transformationTime: 0,
        compilationTime: 0
      }
    };
  }
}

/**
 * Watch mode build
 */
export function watchProject(config: BuildConfig, callback?: (result: BuildResult) => void): void {
  if (!config.watch) {
    throw new Error('Watch mode not enabled in config');
  }
  
  console.log(`[Watch] Starting watch mode for ${config.inputDir}`);
  
  // Simple file watching implementation
  const files = discoverTypeScriptFiles(
    config.inputDir,
    config.includePatterns,
    config.excludePatterns
  );
  
  let lastBuildTime = 0;
  
  // Watch for file changes
  for (const file of files) {
    fs.watchFile(file, { interval: 1000 }, async (curr, prev) => {
      if (curr.mtime.getTime() > lastBuildTime) {
        lastBuildTime = curr.mtime.getTime();
        
        console.log(`[Watch] File changed: ${file}`);
        
        const result = await buildProject(config);
        
        if (callback) {
          callback(result);
        }
        
        if (result.success) {
          console.log(`[Watch] Build successful`);
        } else {
          console.log(`[Watch] Build failed with ${result.errors.length} errors`);
        }
      }
    });
  }
}

// ============================================================================
// ttypescript Integration
// ============================================================================

/**
 * Create ttypescript configuration
 */
export function createTtypescriptConfig(config: BuildConfig): any {
  return {
    compilerOptions: {
      ...config.compilerOptions,
      plugins: [
        {
          transform: './frpFusionTransformer',
          config: config.transformerConfig
        }
      ]
    },
    include: config.includePatterns,
    exclude: config.excludePatterns
  };
}

/**
 * Write ttypescript configuration to file
 */
export function writeTtypescriptConfig(config: BuildConfig, outputPath: string = 'tsconfig.json'): void {
  const ttypescriptConfig = createTtypescriptConfig(config);
  
  fs.writeFileSync(outputPath, JSON.stringify(ttypescriptConfig, null, 2));
  
  console.log(`[Build] Wrote ttypescript config to ${outputPath}`);
}

// ============================================================================
// ts-patch Integration
// ============================================================================

/**
 * Create ts-patch configuration
 */
export function createTspatchConfig(config: BuildConfig): any {
  return {
    compilerOptions: config.compilerOptions,
    include: config.includePatterns,
    exclude: config.excludePatterns,
    transformers: [
      {
        name: 'frp-fusion-transformer',
        factory: './frpFusionTransformer',
        config: config.transformerConfig
      }
    ]
  };
}

/**
 * Write ts-patch configuration to file
 */
export function writeTspatchConfig(config: BuildConfig, outputPath: string = 'tsconfig.json'): void {
  const tspatchConfig = createTspatchConfig(config);
  
  fs.writeFileSync(outputPath, JSON.stringify(tspatchConfig, null, 2));
  
  console.log(`[Build] Wrote ts-patch config to ${outputPath}`);
}

// ============================================================================
// CLI Integration
// ============================================================================

/**
 * Parse command line arguments
 */
export function parseCommandLineArgs(args: string[]): Partial<BuildConfig> {
  const config: Partial<BuildConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
      case '-i':
        config.inputDir = args[++i];
        break;
      case '--output':
      case '-o':
        config.outputDir = args[++i];
        break;
      case '--watch':
      case '-w':
        config.watch = true;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--production':
        Object.assign(config, productionBuildConfig());
        break;
      case '--development':
        Object.assign(config, developmentBuildConfig());
        break;
      case '--no-source-map':
        config.sourceMap = false;
        break;
      case '--no-declaration':
        config.declaration = false;
        break;
      case '--debug':
        config.transformerConfig = { ...defaultConfig(), debugMode: true };
        break;
    }
  }
  
  return config;
}

/**
 * Main CLI function
 */
export async function main(args: string[]): Promise<void> {
  const cliConfig = parseCommandLineArgs(args);
  const config = { ...defaultBuildConfig(), ...cliConfig };
  
  console.log('[FRP Fusion Build] Starting build process...');
  
  if (config.watch) {
    watchProject(config, (result) => {
      if (result.success) {
        console.log(`[Watch] ✅ Build successful - ${result.filesProcessed} files processed`);
      } else {
        console.log(`[Watch] ❌ Build failed - ${result.errors.length} errors`);
        for (const error of result.errors) {
          console.log(`  ${error.messageText}`);
        }
      }
    });
  } else {
    const result = await buildProject(config);
    
    if (result.success) {
      console.log(`✅ Build successful!`);
      console.log(`  Files processed: ${result.filesProcessed}`);
      console.log(`  Files transformed: ${result.filesTransformed}`);
      console.log(`  Build time: ${result.performance.totalTime.toFixed(2)}ms`);
      
      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.length}`);
      }
    } else {
      console.log(`❌ Build failed!`);
      console.log(`  Errors: ${result.errors.length}`);
      
      for (const error of result.errors) {
        console.log(`  ${error.messageText}`);
      }
      
      process.exit(1);
    }
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalBuilds: number;
  totalTime: number;
  averageTime: number;
  fastestBuild: number;
  slowestBuild: number;
  transformationTime: number;
  compilationTime: number;
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalBuilds: 0,
    totalTime: 0,
    averageTime: 0,
    fastestBuild: Infinity,
    slowestBuild: 0,
    transformationTime: 0,
    compilationTime: 0
  };
  
  recordBuild(result: BuildResult): void {
    this.metrics.totalBuilds++;
    this.metrics.totalTime += result.performance.totalTime;
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalBuilds;
    this.metrics.fastestBuild = Math.min(this.metrics.fastestBuild, result.performance.totalTime);
    this.metrics.slowestBuild = Math.max(this.metrics.slowestBuild, result.performance.totalTime);
    this.metrics.transformationTime += result.performance.transformationTime;
    this.metrics.compilationTime += result.performance.compilationTime;
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  printMetrics(): void {
    console.log('\n📊 Performance Metrics:');
    console.log(`  Total builds: ${this.metrics.totalBuilds}`);
    console.log(`  Average time: ${this.metrics.averageTime.toFixed(2)}ms`);
    console.log(`  Fastest build: ${this.metrics.fastestBuild.toFixed(2)}ms`);
    console.log(`  Slowest build: ${this.metrics.slowestBuild.toFixed(2)}ms`);
    console.log(`  Total transformation time: ${this.metrics.transformationTime.toFixed(2)}ms`);
    console.log(`  Total compilation time: ${this.metrics.compilationTime.toFixed(2)}ms`);
  }
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running as main module
if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
} 