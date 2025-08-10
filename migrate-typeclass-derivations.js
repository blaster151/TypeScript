#!/usr/bin/env node

/**
 * Migration Script: Typeclass Derivation Unification
 * 
 * This script helps migrate from the deprecated deriveInstances approach
 * to the preferred individual instance functions approach.
 * 
 * Usage: node migrate-typeclass-derivations.js [file-pattern]
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Migration patterns
const MIGRATION_PATTERNS = [
  {
    name: 'deriveInstances to individual functions',
    pattern: /export\s+const\s+(\w+)Instances\s*=\s*deriveInstances<(\w+)>\(\s*\{([^}]+)\}\s*\);/g,
    replacement: (match, instanceName, kindName, config) => {
      const lines = [];
      const configObj = parseConfig(config);
      
      // Extract individual instances
      if (configObj.functor) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Functor = deriveFunctorInstance<${kindName}>({`);
        if (configObj.customMap) {
          lines.push(`  customMap: ${configObj.customMap},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.applicative) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Applicative = deriveApplicativeInstance<${kindName}>({`);
        if (configObj.customMap) {
          lines.push(`  customMap: ${configObj.customMap},`);
        }
        if (configObj.customOf) {
          lines.push(`  customOf: ${configObj.customOf},`);
        }
        if (configObj.customAp) {
          lines.push(`  customAp: ${configObj.customAp},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.monad) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Monad = deriveMonadInstance<${kindName}>({`);
        if (configObj.customMap) {
          lines.push(`  customMap: ${configObj.customMap},`);
        }
        if (configObj.customChain) {
          lines.push(`  customChain: ${configObj.customChain},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.bifunctor) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Bifunctor = deriveBifunctorInstance<${kindName}>({`);
        if (configObj.customBimap) {
          lines.push(`  customBimap: ${configObj.customBimap},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.eq) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Eq = deriveEqInstance({`);
        if (configObj.customEq) {
          lines.push(`  customEq: ${configObj.customEq},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.ord) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Ord = deriveOrdInstance({`);
        if (configObj.customOrd) {
          lines.push(`  customOrd: ${configObj.customOrd},`);
        }
        lines.push(`});`);
      }
      
      if (configObj.show) {
        lines.push(`export const ${instanceName.replace('Instances', '')}Show = deriveShowInstance({`);
        if (configObj.customShow) {
          lines.push(`  customShow: ${configObj.customShow},`);
        }
        lines.push(`});`);
      }
      
      return lines.join('\n');
    }
  },
  {
    name: 'Registry registration updates',
    pattern: /registry\.registerTypeclass\([^,]+,\s*[^,]+,\s*(\w+)Instances\.(\w+)\)/g,
    replacement: (match, instanceName, typeclass) => {
      return `registry.registerTypeclass(${instanceName}${typeclass.charAt(0).toUpperCase() + typeclass.slice(1)})`;
    }
  },
  {
    name: 'Derivable registration updates',
    pattern: /(\w+):\s*(\w+)Instances\.(\w+)/g,
    replacement: (match, key, instanceName, typeclass) => {
      return `${key}: ${instanceName}${typeclass.charAt(0).toUpperCase() + typeclass.slice(1)}`;
    }
  }
];

function parseConfig(configStr) {
  const config = {};
  const lines = configStr.split('\n').map(line => line.trim());
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        config[key] = value.replace(/,$/, '');
      }
    }
  }
  
  return config;
}

function migrateFile(filePath) {
  console.log(`\n🔧 Migrating: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    for (const pattern of MIGRATION_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        console.log(`  📝 Applying: ${pattern.name}`);
        content = content.replace(pattern.pattern, pattern.replacement);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      // Add deprecation warning comment
      const warningComment = `/**
 * @deprecated This file has been migrated to use individual typeclass derivation functions.
 * See DERIVABLE_INSTANCES.md for the preferred approach.
 */\n\n`;
      
      if (!content.startsWith('/**')) {
        content = warningComment + content;
      }
      
      // Create backup
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
      console.log(`  💾 Backup created: ${backupPath}`);
      
      // Write migrated content
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Migration completed`);
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error migrating ${filePath}:`, error.message);
  }
}

async function findFiles(pattern) {
  try {
    const files = await glob(pattern, { ignore: ['node_modules/**', 'dist/**', '*.backup'] });
    return files;
  } catch (error) {
    throw error;
  }
}

async function main() {
  const pattern = process.argv[2] || '**/*.ts';
  
  console.log('🚀 Typeclass Derivation Migration Tool');
  console.log('=====================================');
  console.log(`📁 Searching for files matching: ${pattern}`);
  
  try {
    const files = await findFiles(pattern);
    
    if (files.length === 0) {
      console.log('❌ No files found matching the pattern');
      return;
    }
    
    console.log(`📋 Found ${files.length} files to check`);
    
    let migratedCount = 0;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('deriveInstances')) {
        migrateFile(file);
        migratedCount++;
      }
    }
    
    console.log(`\n🎉 Migration Summary:`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files migrated: ${migratedCount}`);
    
    if (migratedCount > 0) {
      console.log(`\n📚 Next Steps:`);
      console.log(`   1. Review the migrated files`);
      console.log(`   2. Update any remaining references to .functor, .applicative, etc.`);
      console.log(`   3. Run your tests to ensure everything works correctly`);
      console.log(`   4. Remove .backup files once you're satisfied`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, MIGRATION_PATTERNS };
