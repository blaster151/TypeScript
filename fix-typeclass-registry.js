/**
 * Fix Typeclass Registry
 * 
 * Scans the typeclass registry for missing purity fields and Eq/Ord/Show derivations,
 * then automatically adds them where applicable.
 */

console.log('🔧 Fixing Typeclass Registry');
console.log('============================');

// ============================================================================
// Type Definitions with Expected Purity and Derivation Capabilities
// ============================================================================

const TYPE_DEFINITIONS = {
  // Pure ADTs that can derive Eq/Ord/Show
  'Maybe': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'MaybeK',
    file: 'fp-maybe-unified-enhanced.ts'
  },
  'Either': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'EitherK',
    file: 'fp-either.ts'
  },
  'Result': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'ResultK',
    file: 'fp-result.ts'
  },
  'Expr': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'ExprK',
    file: 'fp-gadt-enhanced.ts'
  },
  'MaybeGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'MaybeGADTK',
    file: 'fp-gadt-enhanced.ts'
  },
  'EitherGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'EitherGADTK',
    file: 'fp-gadt-enhanced.ts'
  },
  'ListGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'ListGADTK',
    file: 'fp-gadt.ts'
  },
  'PersistentList': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentListK',
    file: 'fp-persistent.ts'
  },
  'PersistentMap': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentMapK',
    file: 'fp-persistent.ts'
  },
  'PersistentSet': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentSetK',
    file: 'fp-persistent.ts'
  },
  'Array': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'ArrayK',
    file: 'fp-typeclasses-hkt.ts'
  },
  
  // Effect types that cannot derive Eq/Ord/Show
  'ObservableLite': {
    purity: 'Async',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    kind: 'ObservableLiteK',
    file: 'fp-observable-lite.ts',
    reason: 'Effect type with subscriptions and side effects'
  },
  'StatefulStream': {
    purity: 'State',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    kind: 'StatefulStreamK',
    file: 'fp-stream-state.ts',
    reason: 'Stateful stream with mutable state'
  },
  'Function': {
    purity: 'Impure',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    kind: 'FunctionK',
    file: 'fp-profunctor-optics.ts',
    reason: 'Function type with arbitrary behavior'
  },
  
  // HKT versions (duplicates that need consolidation)
  'PersistentListHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentListHKT',
    file: 'fp-persistent-hkt-gadt.ts'
  },
  'PersistentMapHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentMapHKT',
    file: 'fp-persistent-hkt-gadt.ts'
  },
  'PersistentSetHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    kind: 'PersistentSetHKT',
    file: 'fp-persistent-hkt-gadt.ts'
  }
};

// ============================================================================
// File System Operations
// ============================================================================

const fs = require('fs');
const path = require('path');

function checkFileForDerivation(filePath, typeName, derivationType) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasDerivation: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for derivation patterns
    const derivationPatterns = {
      'Eq': new RegExp(`export const ${typeName}Eq\\s*=\\s*deriveEqInstance`),
      'Ord': new RegExp(`export const ${typeName}Ord\\s*=\\s*deriveOrdInstance`),
      'Show': new RegExp(`export const ${typeName}Show\\s*=\\s*deriveShowInstance`)
    };
    
    const pattern = derivationPatterns[derivationType];
    const hasDerivation = pattern.test(content);
    
    return {
      hasDerivation: hasDerivation,
      fileExists: true
    };
  } catch (error) {
    return { hasDerivation: false, error: error.message };
  }
}

function checkFileForRegistration(filePath, typeName, derivationType) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasRegistration: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for registration patterns
    const registrationPatterns = {
      'Eq': new RegExp(`registry\\.register.*${typeName}Eq`),
      'Ord': new RegExp(`registry\\.register.*${typeName}Ord`),
      'Show': new RegExp(`registry\\.register.*${typeName}Show`)
    };
    
    const pattern = registrationPatterns[derivationType];
    const hasRegistration = pattern.test(content);
    
    return {
      hasRegistration: hasRegistration,
      fileExists: true
    };
  } catch (error) {
    return { hasRegistration: false, error: error.message };
  }
}

function checkFileForPurityTag(filePath, typeName) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasPurity: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for purity tag patterns
    const purityPatterns = [
      new RegExp(`__purity:\\s*['"]\\w+['"]`, 'g'),
      new RegExp(`purity:\\s*['"]\\w+['"]`, 'g'),
      new RegExp(`EffectTag\\.\\w+`, 'g'),
      new RegExp(`attachPurityMarker.*['"]\\w+['"]`, 'g')
    ];
    
    let hasPurity = false;
    let foundPurity = null;
    
    for (const pattern of purityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        hasPurity = true;
        foundPurity = matches[0];
        break;
      }
    }
    
    return {
      hasPurity: hasPurity,
      foundPurity: foundPurity,
      fileExists: true
    };
  } catch (error) {
    return { hasPurity: false, error: error.message };
  }
}

// ============================================================================
// Add Missing Derivations
// ============================================================================

function addMissingDerivations() {
  console.log('\n🔧 Adding Missing Eq/Ord/Show Derivations...\n');
  
  const results = {
    '✅ Already had all': [],
    '🔄 Added all': [],
    '❌ Skipped': []
  };
  
  for (const [typeName, typeDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Processing ${typeName}...`);
    
    if (!typeDef.canDeriveEq && !typeDef.canDeriveOrd && !typeDef.canDeriveShow) {
      console.log(`   ❌ Skipped: ${typeDef.reason || 'Cannot derive Eq/Ord/Show'}`);
      results['❌ Skipped'].push({
        type: typeName,
        reason: typeDef.reason || 'Cannot derive Eq/Ord/Show'
      });
      console.log('');
      continue;
    }
    
    const filePath = path.join(__dirname, typeDef.file);
    const derivations = ['Eq', 'Ord', 'Show'];
    const derivationResults = {};
    
    let allDerivationsPresent = true;
    let allRegistrationsPresent = true;
    
    for (const derivationType of derivations) {
      const derivationCheck = checkFileForDerivation(filePath, typeName, derivationType);
      const registrationCheck = checkFileForRegistration(filePath, typeName, derivationType);
      
      if (derivationCheck.error) {
        console.log(`   ⚠️  ${derivationCheck.error}`);
        allDerivationsPresent = false;
      } else if (derivationCheck.hasDerivation) {
        console.log(`   ✅ Has ${derivationType} derivation`);
        
        if (registrationCheck.hasRegistration) {
          console.log(`   ✅ Has ${derivationType} registration`);
        } else {
          console.log(`   ❌ Missing ${derivationType} registration`);
          allRegistrationsPresent = false;
        }
      } else {
        console.log(`   ❌ Missing ${derivationType} derivation`);
        allDerivationsPresent = false;
      }
      
      derivationResults[derivationType] = {
        hasDerivation: derivationCheck.hasDerivation,
        hasRegistration: registrationCheck.hasRegistration
      };
    }
    
    if (allDerivationsPresent && allRegistrationsPresent) {
      console.log(`   ✅ Already had all derivations and registrations`);
      results['✅ Already had all'].push({
        type: typeName,
        derivations: derivationResults
      });
    } else {
      console.log(`   🔄 Adding missing derivations and registrations`);
      results['🔄 Added all'].push({
        type: typeName,
        derivations: derivationResults,
        kind: typeDef.kind,
        file: typeDef.file
      });
      
      // Add the derivations to the file
      addDerivationsToFile(filePath, typeName, typeDef.kind);
    }
    
    console.log('');
  }
  
  return results;
}

function addDerivationsToFile(filePath, typeName, kind) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if derivations already exist
    const hasEq = content.includes(`export const ${typeName}Eq`);
    const hasOrd = content.includes(`export const ${typeName}Ord`);
    const hasShow = content.includes(`export const ${typeName}Show`);
    
    // Add missing derivations
    const derivationsToAdd = [];
    
    if (!hasEq) {
      derivationsToAdd.push(`export const ${typeName}Eq = deriveEqInstance({ kind: ${kind} });`);
    }
    
    if (!hasOrd) {
      derivationsToAdd.push(`export const ${typeName}Ord = deriveOrdInstance({ kind: ${kind} });`);
    }
    
    if (!hasShow) {
      derivationsToAdd.push(`export const ${typeName}Show = deriveShowInstance({ kind: ${kind} });`);
    }
    
    if (derivationsToAdd.length > 0) {
      // Add import statements if needed
      if (!content.includes('deriveEqInstance')) {
        content = content.replace(
          /import.*from.*['"]\.\/fp-derivation-helpers['"];?/,
          `import { deriveEqInstance, deriveOrdInstance, deriveShowInstance } from './fp-derivation-helpers';`
        );
      }
      
      // Add derivations before the last export or at the end
      const lastExportIndex = content.lastIndexOf('export');
      if (lastExportIndex !== -1) {
        const insertIndex = content.indexOf('\n', lastExportIndex) + 1;
        content = content.slice(0, insertIndex) + 
                 derivationsToAdd.join('\n') + '\n' + 
                 content.slice(insertIndex);
      } else {
        content += '\n' + derivationsToAdd.join('\n') + '\n';
      }
      
      // Add registration function
      const registrationFunction = `
export function register${typeName}Derivations(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    ${!hasEq ? `registry.register('${typeName}Eq', ${typeName}Eq);` : ''}
    ${!hasOrd ? `registry.register('${typeName}Ord', ${typeName}Ord);` : ''}
    ${!hasShow ? `registry.register('${typeName}Show', ${typeName}Show);` : ''}
  }
}
register${typeName}Derivations();`;
      
      content += registrationFunction;
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Added derivations to ${filePath}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error adding derivations: ${error.message}`);
  }
}

// ============================================================================
// Add Missing Purity Tags
// ============================================================================

function addMissingPurityTags() {
  console.log('\n🔧 Adding Missing Purity Tags...\n');
  
  const results = {
    '✅ Already tagged correctly': [],
    '🔄 Newly tagged': [],
    '❌ Needs manual review': []
  };
  
  for (const [typeName, typeDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Processing ${typeName} purity...`);
    
    const filePath = path.join(__dirname, typeDef.file);
    const purityCheck = checkFileForPurityTag(filePath, typeName);
    
    if (purityCheck.error) {
      console.log(`   ⚠️  ${purityCheck.error}`);
      results['❌ Needs manual review'].push({
        type: typeName,
        expectedPurity: typeDef.purity,
        error: purityCheck.error
      });
    } else if (purityCheck.hasPurity) {
      console.log(`   ✅ Already has purity tag: ${purityCheck.foundPurity}`);
      results['✅ Already tagged correctly'].push({
        type: typeName,
        expectedPurity: typeDef.purity,
        foundPurity: purityCheck.foundPurity
      });
    } else {
      console.log(`   🔄 Adding purity tag: ${typeDef.purity}`);
      results['🔄 Newly tagged'].push({
        type: typeName,
        expectedPurity: typeDef.purity,
        file: typeDef.file
      });
      
      // Add purity tag to the file
      addPurityTagToFile(filePath, typeName, typeDef.purity, typeDef.kind);
    }
    
    console.log('');
  }
  
  return results;
}

function addPurityTagToFile(filePath, typeName, purity, kind) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if purity tag already exists
    if (content.includes(`attachPurityMarker`) || content.includes(`__purity`)) {
      console.log(`   ⚠️  Purity tag already exists in file`);
      return;
    }
    
    // Find the instances export
    const instancesPattern = new RegExp(`export const ${typeName}Instances\\s*=\\s*deriveInstances`);
    const match = content.match(instancesPattern);
    
    if (match) {
      // Add purity tag after the instances definition
      const insertIndex = content.indexOf(';', match.index) + 1;
      const purityTag = `\nattachPurityMarker(${typeName}Instances, '${purity}');`;
      
      content = content.slice(0, insertIndex) + purityTag + content.slice(insertIndex);
      
      // Add import if needed
      if (!content.includes('attachPurityMarker')) {
        content = content.replace(
          /import.*from.*['"]\.\/fp-purity['"];?/,
          `import { attachPurityMarker } from './fp-purity';`
        );
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Added purity tag to ${filePath}`);
    } else {
      console.log(`   ⚠️  Could not find ${typeName}Instances to attach purity tag`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error adding purity tag: ${error.message}`);
  }
}

// ============================================================================
// Generate Summary Table
// ============================================================================

function generateSummaryTable(derivationResults, purityResults) {
  console.log('\n📊 Summary Table');
  console.log('================');
  console.log('Type\t\tEq\tOrd\tShow\tAction Taken');
  console.log('----\t\t--\t---\t----\t------------');
  
  for (const [typeName, typeDef] of Object.entries(TYPE_DEFINITIONS)) {
    const derivationResult = derivationResults['✅ Already had all'].find(r => r.type === typeName) ||
                            derivationResults['🔄 Added all'].find(r => r.type === typeName) ||
                            derivationResults['❌ Skipped'].find(r => r.type === typeName);
    
    let action = '';
    let eq = '❌', ord = '❌', show = '❌';
    
    if (derivationResult) {
      if (derivationResult.reason) {
        action = 'Skipped';
        eq = ord = show = 'N/A';
      } else if (derivationResult.derivations) {
        eq = derivationResult.derivations.Eq?.hasDerivation ? '✅' : '🔄';
        ord = derivationResult.derivations.Ord?.hasDerivation ? '✅' : '🔄';
        show = derivationResult.derivations.Show?.hasDerivation ? '✅' : '🔄';
        
        if (eq === '✅' && ord === '✅' && show === '✅') {
          action = 'Already had all';
        } else {
          action = 'Added all';
        }
      }
    }
    
    console.log(`${typeName.padEnd(15)}\t${eq}\t${ord}\t${show}\t${action}`);
  }
  
  console.log('\n📈 Summary Statistics:');
  console.log('=====================');
  console.log(`Total types processed: ${Object.keys(TYPE_DEFINITIONS).length}`);
  console.log(`Derivations:`);
  console.log(`  ✅ Already had all: ${derivationResults['✅ Already had all'].length}`);
  console.log(`  🔄 Added all: ${derivationResults['🔄 Added all'].length}`);
  console.log(`  ❌ Skipped: ${derivationResults['❌ Skipped'].length}`);
  console.log(`Purity tags:`);
  console.log(`  ✅ Already tagged correctly: ${purityResults['✅ Already tagged correctly'].length}`);
  console.log(`  🔄 Newly tagged: ${purityResults['🔄 Newly tagged'].length}`);
  console.log(`  ❌ Needs manual review: ${purityResults['❌ Needs manual review'].length}`);
}

// ============================================================================
// Main Execution
// ============================================================================

function fixTypeclassRegistry() {
  console.log('🚀 Fixing Typeclass Registry...\n');
  
  // Add missing derivations
  const derivationResults = addMissingDerivations();
  
  // Add missing purity tags
  const purityResults = addMissingPurityTags();
  
  // Generate summary table
  generateSummaryTable(derivationResults, purityResults);
  
  return {
    derivations: derivationResults,
    purity: purityResults
  };
}

// Run fix if this file is executed directly
if (require.main === module) {
  fixTypeclassRegistry();
}

module.exports = {
  addMissingDerivations,
  addMissingPurityTags,
  generateSummaryTable,
  fixTypeclassRegistry
}; 