/**
 * Simple ADT Usage Migration Script
 * 
 * This script automatically migrates old ADT usage patterns to the new unified system.
 * It handles:
 * - Import statement updates
 * - Constructor call updates
 * - Pattern matching updates
 * - Type reference updates
 */

const fs = require('fs');
const path = require('path');

// Migration rules
const MIGRATION_RULES = [
  // Import statement migrations
  {
    name: 'Update Maybe imports',
    find: /import\s*{\s*([^}]*)\s*}\s*from\s*['"`]([^'"`]*maybe[^'"`]*)['"`]/gi,
    replace: (match, imports, modulePath) => {
      return `import { ${imports} } from './fp-maybe-unified'`;
    }
  },
  {
    name: 'Update Either imports',
    find: /import\s*{\s*([^}]*)\s*}\s*from\s*['"`]([^'"`]*either[^'"`]*)['"`]/gi,
    replace: (match, imports, modulePath) => {
      return `import { ${imports} } from './fp-either-unified'`;
    }
  },
  {
    name: 'Update Result imports',
    find: /import\s*{\s*([^}]*)\s*}\s*from\s*['"`]([^'"`]*result[^'"`]*)['"`]/gi,
    replace: (match, imports, modulePath) => {
      return `import { ${imports} } from './fp-result-unified'`;
    }
  },
  
  // Constructor call migrations
  {
    name: 'Update Maybe.Just calls',
    find: /Maybe\.Just\s*\(/g,
    replace: 'Just('
  },
  {
    name: 'Update Maybe.Nothing calls',
    find: /Maybe\.Nothing\s*\(/g,
    replace: 'Nothing('
  },
  {
    name: 'Update Either.Left calls',
    find: /Either\.Left\s*\(/g,
    replace: 'Left('
  },
  {
    name: 'Update Either.Right calls',
    find: /Either\.Right\s*\(/g,
    replace: 'Right('
  },
  {
    name: 'Update Result.Ok calls',
    find: /Result\.Ok\s*\(/g,
    replace: 'Ok('
  },
  {
    name: 'Update Result.Err calls',
    find: /Result\.Err\s*\(/g,
    replace: 'Err('
  },
  
  // Type reference migrations
  {
    name: 'Update Maybe type imports',
    find: /import\s*{\s*Maybe\s*}\s*from\s*['"`]([^'"`]*)['"`]/gi,
    replace: (match, modulePath) => {
      return `import { Maybe } from './fp-maybe-unified'`;
    }
  },
  {
    name: 'Update Either type imports',
    find: /import\s*{\s*Either\s*}\s*from\s*['"`]([^'"`]*)['"`]/gi,
    replace: (match, modulePath) => {
      return `import { Either } from './fp-either-unified'`;
    }
  },
  {
    name: 'Update Result type imports',
    find: /import\s*{\s*Result\s*}\s*from\s*['"`]([^'"`]*)['"`]/gi,
    replace: (match, modulePath) => {
      return `import { Result } from './fp-result-unified'`;
    }
  }
];

// Files to exclude from migration
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  'fp-maybe-unified.ts',
  'fp-either-unified.ts',
  'fp-result-unified.ts',
  'fp-adt-registry.ts',
  'test-adt-migration.ts',
  'migrate-adt-usage.js',
  'migrate-adt-usage-simple.js'
];

/**
 * Check if a file should be excluded from migration
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Recursively find all TypeScript/JavaScript files
 */
function findFiles(dir = '.', files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!shouldExcludeFile(fullPath)) {
        findFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !shouldExcludeFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Apply migration rules to a file
 */
function migrateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let migratedContent = content;
    let changes = [];
    
    // Apply each migration rule
    MIGRATION_RULES.forEach(rule => {
      const matches = migratedContent.match(rule.find);
      if (matches) {
        if (typeof rule.replace === 'function') {
          migratedContent = migratedContent.replace(rule.find, rule.replace);
        } else {
          migratedContent = migratedContent.replace(rule.find, rule.replace);
        }
        changes.push({
          rule: rule.name,
          matches: matches.length
        });
      }
    });
    
    // Write back if changes were made
    if (changes.length > 0) {
      fs.writeFileSync(filePath, migratedContent, 'utf8');
      return {
        file: filePath,
        changes: changes,
        success: true
      };
    }
    
    return {
      file: filePath,
      changes: [],
      success: true
    };
  } catch (error) {
    return {
      file: filePath,
      error: error.message,
      success: false
    };
  }
}

/**
 * Main migration function
 */
function migrateADTUsage() {
  console.log('🚀 Starting ADT Usage Migration...\n');
  
  // Find all files
  console.log('📁 Scanning for files...');
  const files = findFiles();
  console.log(`Found ${files.length} files to process\n`);
  
  // Process each file
  const results = [];
  let totalChanges = 0;
  
  files.forEach((file, index) => {
    console.log(`[${index + 1}/${files.length}] Processing: ${file}`);
    const result = migrateFile(file);
    results.push(result);
    
    if (result.changes.length > 0) {
      console.log(`  ✅ Applied ${result.changes.length} changes:`);
      result.changes.forEach(change => {
        console.log(`    - ${change.rule}: ${change.matches} matches`);
        totalChanges += change.matches;
      });
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
  });
  
  // Summary
  console.log('\n📋 Migration Summary:');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Files with changes: ${results.filter(r => r.changes.length > 0).length}`);
  console.log(`Total changes applied: ${totalChanges}`);
  
  // Show detailed results
  const filesWithChanges = results.filter(r => r.changes.length > 0);
  if (filesWithChanges.length > 0) {
    console.log('\n📝 Files with changes:');
    filesWithChanges.forEach(result => {
      console.log(`\n${result.file}:`);
      result.changes.forEach(change => {
        console.log(`  - ${change.rule}: ${change.matches} matches`);
      });
    });
  }
  
  // Show errors
  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(result => {
      console.log(`\n${result.file}:`);
      console.log(`  Error: ${result.error}`);
    });
  }
  
  console.log('\n✅ ADT Usage Migration completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Review the changes made');
  console.log('2. Run your test suite to verify functionality');
  console.log('3. Check for any remaining old ADT usage patterns');
  console.log('4. Update any documentation that references old ADT modules');
  
  return results;
}

/**
 * Verification function to check for remaining old patterns
 */
function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const files = findFiles();
  const remainingPatterns = [];
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for old patterns
      const oldPatterns = [
        { pattern: /Maybe\./g, name: 'Maybe.' },
        { pattern: /Either\./g, name: 'Either.' },
        { pattern: /Result\./g, name: 'Result.' },
        { pattern: /from\s*['"`][^'"`]*maybe[^'"`]*['"`]/gi, name: 'old maybe import' },
        { pattern: /from\s*['"`][^'"`]*either[^'"`]*['"`]/gi, name: 'old either import' },
        { pattern: /from\s*['"`][^'"`]*result[^'"`]*['"`]/gi, name: 'old result import' }
      ];
      
      oldPatterns.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          remainingPatterns.push({
            file,
            pattern: name,
            count: matches.length,
            lines: matches.slice(0, 3).map(match => {
              const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
              return `${lineNumber}: ${match.trim()}`;
            })
          });
        }
      });
    } catch (error) {
      console.log(`Error reading ${file}: ${error.message}`);
    }
  });
  
  if (remainingPatterns.length > 0) {
    console.log('\n⚠️  Remaining old patterns found:');
    remainingPatterns.forEach(item => {
      console.log(`\n${item.file} (${item.count} instances of ${item.pattern}):`);
      item.lines.forEach(line => console.log(`  ${line}`));
    });
  } else {
    console.log('\n✅ No remaining old patterns found!');
  }
  
  return remainingPatterns;
}

// Run migration if this script is executed directly
if (require.main === module) {
  const results = migrateADTUsage();
  const remainingPatterns = verifyMigration();
  
  // Exit with appropriate code
  const hasErrors = results.some(r => !r.success);
  const hasRemainingPatterns = remainingPatterns.length > 0;
  
  if (hasErrors) {
    console.log('\n❌ Migration completed with errors');
    process.exit(1);
  } else if (hasRemainingPatterns) {
    console.log('\n⚠️  Migration completed with remaining patterns to review');
    process.exit(2);
  } else {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  }
}

module.exports = {
  migrateADTUsage,
  verifyMigration,
  MIGRATION_RULES
}; 