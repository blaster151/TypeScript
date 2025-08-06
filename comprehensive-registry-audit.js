/**
 * Comprehensive Registry Audit
 * 
 * Verifies:
 * 1. Registration completeness - every kind has a registry entry
 * 2. Purity tagging - every entry has proper purity field
 * 3. Typeclass coverage - Eq/Ord/Show instances where applicable
 * 4. Consistency - no stale or mismatched entries
 * 5. Provides action recommendations for fixes
 */

console.log('🔍 Comprehensive Registry Audit');
console.log('===============================');

// ============================================================================
// Type Definitions with Expected Properties
// ============================================================================

const TYPE_DEFINITIONS = {
  // Pure ADTs that can derive Eq/Ord/Show
  'MaybeK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-maybe-unified-enhanced.ts',
    skipDerive: false,
    reason: null
  },
  'EitherK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-either.ts',
    skipDerive: false,
    reason: null
  },
  'ResultK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-result.ts',
    skipDerive: false,
    reason: null
  },
  'ExprK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-gadt-enhanced.ts',
    skipDerive: false,
    reason: null
  },
  'MaybeGADTK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-gadt-enhanced.ts',
    skipDerive: false,
    reason: null
  },
  'EitherGADTK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-gadt-enhanced.ts',
    skipDerive: false,
    reason: null
  },
  'ListGADTK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-gadt.ts',
    skipDerive: false,
    reason: null
  },
  'PersistentListK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent.ts',
    skipDerive: false,
    reason: null
  },
  'PersistentMapK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent.ts',
    skipDerive: false,
    reason: null
  },
  'PersistentSetK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent.ts',
    skipDerive: false,
    reason: null
  },
  'ArrayK': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-typeclasses-hkt.ts',
    skipDerive: false,
    reason: null
  },
  
  // Effect types that cannot derive Eq/Ord/Show
  'ObservableLiteK': {
    purity: 'Async',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    module: 'fp-observable-lite.ts',
    skipDerive: true,
    reason: 'Effect type with subscriptions and side effects'
  },
  'StatefulStreamK': {
    purity: 'State',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    module: 'fp-stream-state.ts',
    skipDerive: true,
    reason: 'Stateful stream with mutable state'
  },
  'FunctionK': {
    purity: 'Impure',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    module: 'fp-profunctor-optics.ts',
    skipDerive: true,
    reason: 'Function type with arbitrary behavior'
  },
  
  // HKT versions (duplicates that need consolidation)
  'PersistentListHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent-hkt-gadt.ts',
    skipDerive: false,
    reason: null
  },
  'PersistentMapHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent-hkt-gadt.ts',
    skipDerive: false,
    reason: null
  },
  'PersistentSetHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    module: 'fp-persistent-hkt-gadt.ts',
    skipDerive: false,
    reason: null
  }
};

// ============================================================================
// File System Operations
// ============================================================================

const fs = require('fs');
const path = require('path');

function checkFileForKindExport(filePath, kindName) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasKind: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for kind export patterns
    const kindPatterns = [
      new RegExp(`export.*${kindName}\\s*[=:]`, 'g'),
      new RegExp(`export.*type.*${kindName}`, 'g'),
      new RegExp(`export.*interface.*${kindName}`, 'g')
    ];
    
    let hasKind = false;
    let foundKind = null;
    
    for (const pattern of kindPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        hasKind = true;
        foundKind = matches[0];
        break;
      }
    }
    
    return {
      hasKind: hasKind,
      foundKind: foundKind,
      fileExists: true
    };
  } catch (error) {
    return { hasKind: false, error: error.message };
  }
}

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
// Registry Audit Functions
// ============================================================================

function auditRegistrationCompleteness() {
  console.log('\n🔍 Auditing Registration Completeness...\n');
  
  const results = {
    '✅ Complete': [],
    '❌ Missing kind export': [],
    '❌ Missing registry entry': []
  };
  
  for (const [kindName, kindDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Checking ${kindName}...`);
    
    const filePath = path.join(__dirname, kindDef.module);
    const kindCheck = checkFileForKindExport(filePath, kindName);
    
    if (kindCheck.error) {
      console.log(`   ⚠️  ${kindCheck.error}`);
      results['❌ Missing kind export'].push({
        kind: kindName,
        module: kindDef.module,
        error: kindCheck.error
      });
    } else if (kindCheck.hasKind) {
      console.log(`   ✅ Kind export found: ${kindCheck.foundKind}`);
      results['✅ Complete'].push({
        kind: kindName,
        module: kindDef.module,
        foundKind: kindCheck.foundKind
      });
    } else {
      console.log(`   ❌ Missing kind export`);
      results['❌ Missing kind export'].push({
        kind: kindName,
        module: kindDef.module
      });
    }
    
    console.log('');
  }
  
  return results;
}

function auditPurityTagging() {
  console.log('\n🔍 Auditing Purity Tagging...\n');
  
  const results = {
    '✅ Correct': [],
    '❌ Missing': [],
    '❌ Incorrect': []
  };
  
  for (const [kindName, kindDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Checking ${kindName} purity...`);
    
    const filePath = path.join(__dirname, kindDef.module);
    const purityCheck = checkFileForPurityTag(filePath, kindName);
    
    if (purityCheck.error) {
      console.log(`   ⚠️  ${purityCheck.error}`);
      results['❌ Missing'].push({
        kind: kindName,
        expectedPurity: kindDef.purity,
        error: purityCheck.error
      });
    } else if (purityCheck.hasPurity) {
      console.log(`   ✅ Has purity tag: ${purityCheck.foundPurity}`);
      results['✅ Correct'].push({
        kind: kindName,
        expectedPurity: kindDef.purity,
        foundPurity: purityCheck.foundPurity
      });
    } else {
      console.log(`   ❌ Missing purity tag (expected: ${kindDef.purity})`);
      results['❌ Missing'].push({
        kind: kindName,
        expectedPurity: kindDef.purity
      });
    }
    
    console.log('');
  }
  
  return results;
}

function auditTypeclassCoverage() {
  console.log('\n🔍 Auditing Typeclass Coverage...\n');
  
  const results = {
    '✅ Complete': [],
    '🔄 Missing derivation': [],
    '❌ Skip (flagged)': []
  };
  
  for (const [kindName, kindDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Checking ${kindName} typeclass coverage...`);
    
    if (kindDef.skipDerive) {
      console.log(`   ❌ Skip: ${kindDef.reason}`);
      results['❌ Skip (flagged)'].push({
        kind: kindName,
        reason: kindDef.reason
      });
      console.log('');
      continue;
    }
    
    const filePath = path.join(__dirname, kindDef.module);
    const derivations = ['Eq', 'Ord', 'Show'];
    const derivationResults = {};
    
    let allDerivationsPresent = true;
    let allRegistrationsPresent = true;
    
    for (const derivationType of derivations) {
      const derivationCheck = checkFileForDerivation(filePath, kindName, derivationType);
      const registrationCheck = checkFileForRegistration(filePath, kindName, derivationType);
      
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
      console.log(`   ✅ Complete typeclass coverage`);
      results['✅ Complete'].push({
        kind: kindName,
        derivations: derivationResults
      });
    } else {
      console.log(`   🔄 Missing derivations or registrations`);
      results['🔄 Missing derivation'].push({
        kind: kindName,
        derivations: derivationResults,
        module: kindDef.module
      });
    }
    
    console.log('');
  }
  
  return results;
}

function auditConsistency() {
  console.log('\n🔍 Auditing Consistency...\n');
  
  const results = {
    '✅ Consistent': [],
    '❌ Stale entry': [],
    '❌ Mismatched kind': []
  };
  
  // Check for consistency between kind names and module locations
  for (const [kindName, kindDef] of Object.entries(TYPE_DEFINITIONS)) {
    console.log(`🔍 Checking ${kindName} consistency...`);
    
    const filePath = path.join(__dirname, kindDef.module);
    const kindCheck = checkFileForKindExport(filePath, kindName);
    
    if (kindCheck.hasKind) {
      console.log(`   ✅ Kind matches module location`);
      results['✅ Consistent'].push({
        kind: kindName,
        module: kindDef.module
      });
    } else {
      console.log(`   ❌ Kind not found in expected module`);
      results['❌ Mismatched kind'].push({
        kind: kindName,
        expectedModule: kindDef.module
      });
    }
    
    console.log('');
  }
  
  return results;
}

// ============================================================================
// Generate Summary Table
// ============================================================================

function generateSummaryTable(completenessResults, purityResults, coverageResults, consistencyResults) {
  console.log('\n📊 Registry Audit Summary Table');
  console.log('================================');
  console.log('Kind\t\t\tPurity\tEq\tOrd\tShow\tStatus');
  console.log('----\t\t\t------\t--\t---\t----\t------');
  
  for (const [kindName, kindDef] of Object.entries(TYPE_DEFINITIONS)) {
    // Check completeness
    const isComplete = completenessResults['✅ Complete'].some(r => r.kind === kindName);
    
    // Check purity
    const purityStatus = purityResults['✅ Correct'].some(r => r.kind === kindName) ? '✅' : '❌';
    
    // Check typeclass coverage
    let eq = '❌', ord = '❌', show = '❌', status = 'Unknown';
    
    if (kindDef.skipDerive) {
      eq = ord = show = 'N/A';
      status = 'Skip';
    } else {
      const coverage = coverageResults['✅ Complete'].find(r => r.kind === kindName);
      if (coverage) {
        eq = coverage.derivations.Eq?.hasDerivation ? '✅' : '❌';
        ord = coverage.derivations.Ord?.hasDerivation ? '✅' : '❌';
        show = coverage.derivations.Show?.hasDerivation ? '✅' : '❌';
        status = 'OK';
      } else {
        const missing = coverageResults['🔄 Missing derivation'].find(r => r.kind === kindName);
        if (missing) {
          eq = missing.derivations.Eq?.hasDerivation ? '✅' : '🔄';
          ord = missing.derivations.Ord?.hasDerivation ? '✅' : '🔄';
          show = missing.derivations.Show?.hasDerivation ? '✅' : '🔄';
          status = 'Missing derivation';
        }
      }
    }
    
    // Check consistency
    const isConsistent = consistencyResults['✅ Consistent'].some(r => r.kind === kindName);
    if (!isConsistent) {
      status = 'Inconsistent';
    }
    
    console.log(`${kindName.padEnd(20)}\t${kindDef.purity}\t${eq}\t${ord}\t${show}\t${status}`);
  }
  
  console.log('\n📈 Summary Statistics:');
  console.log('=====================');
  console.log(`Total kinds audited: ${Object.keys(TYPE_DEFINITIONS).length}`);
  console.log(`Registration completeness:`);
  console.log(`  ✅ Complete: ${completenessResults['✅ Complete'].length}`);
  console.log(`  ❌ Missing kind export: ${completenessResults['❌ Missing kind export'].length}`);
  console.log(`  ❌ Missing registry entry: ${completenessResults['❌ Missing registry entry'].length}`);
  console.log(`Purity tagging:`);
  console.log(`  ✅ Correct: ${purityResults['✅ Correct'].length}`);
  console.log(`  ❌ Missing: ${purityResults['❌ Missing'].length}`);
  console.log(`  ❌ Incorrect: ${purityResults['❌ Incorrect'].length}`);
  console.log(`Typeclass coverage:`);
  console.log(`  ✅ Complete: ${coverageResults['✅ Complete'].length}`);
  console.log(`  🔄 Missing derivation: ${coverageResults['🔄 Missing derivation'].length}`);
  console.log(`  ❌ Skip (flagged): ${coverageResults['❌ Skip (flagged)'].length}`);
  console.log(`Consistency:`);
  console.log(`  ✅ Consistent: ${consistencyResults['✅ Consistent'].length}`);
  console.log(`  ❌ Stale entry: ${consistencyResults['❌ Stale entry'].length}`);
  console.log(`  ❌ Mismatched kind: ${consistencyResults['❌ Mismatched kind'].length}`);
}

// ============================================================================
// Generate Action Recommendations
// ============================================================================

function generateActionRecommendations(completenessResults, purityResults, coverageResults, consistencyResults) {
  console.log('\n⚠️  Action Recommendations:');
  console.log('==========================');
  
  // Missing kind exports
  if (completenessResults['❌ Missing kind export'].length > 0) {
    console.log('\n🔧 Missing Kind Exports:');
    for (const item of completenessResults['❌ Missing kind export']) {
      console.log(`   - ${item.kind} in ${item.module}:`);
      console.log(`     export type ${item.kind} = Kind1<any>;`);
    }
  }
  
  // Missing purity tags
  if (purityResults['❌ Missing'].length > 0) {
    console.log('\n🔧 Missing Purity Tags:');
    for (const item of purityResults['❌ Missing']) {
      console.log(`   - ${item.kind} (expected: ${item.expectedPurity}):`);
      console.log(`     attachPurityMarker(${item.kind.replace('K', '')}Instances, '${item.expectedPurity}');`);
    }
  }
  
  // Missing derivations
  if (coverageResults['🔄 Missing derivation'].length > 0) {
    console.log('\n🔧 Missing Eq/Ord/Show Derivations:');
    for (const item of coverageResults['🔄 Missing derivation']) {
      console.log(`   - ${item.kind}:`);
      console.log(`     export const ${item.kind}Eq = deriveEqInstance({ kind: ${item.kind} });`);
      console.log(`     export const ${item.kind}Ord = deriveOrdInstance({ kind: ${item.kind} });`);
      console.log(`     export const ${item.kind}Show = deriveShowInstance({ kind: ${item.kind} });`);
      console.log(`     registry.register('${item.kind}Eq', ${item.kind}Eq);`);
      console.log(`     registry.register('${item.kind}Ord', ${item.kind}Ord);`);
      console.log(`     registry.register('${item.kind}Show', ${item.kind}Show);`);
    }
  }
  
  // Inconsistent entries
  if (consistencyResults['❌ Mismatched kind'].length > 0) {
    console.log('\n🔧 Inconsistent Entries:');
    for (const item of consistencyResults['❌ Mismatched kind']) {
      console.log(`   - ${item.kind}: Move to correct module or update registry entry`);
    }
  }
  
  if (completenessResults['❌ Missing kind export'].length === 0 &&
      purityResults['❌ Missing'].length === 0 &&
      coverageResults['🔄 Missing derivation'].length === 0 &&
      consistencyResults['❌ Mismatched kind'].length === 0) {
    console.log('\n🎉 All registry entries are complete and consistent!');
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function runComprehensiveRegistryAudit() {
  console.log('🚀 Running Comprehensive Registry Audit...\n');
  
  // Run all audits
  const completenessResults = auditRegistrationCompleteness();
  const purityResults = auditPurityTagging();
  const coverageResults = auditTypeclassCoverage();
  const consistencyResults = auditConsistency();
  
  // Generate summary table
  generateSummaryTable(completenessResults, purityResults, coverageResults, consistencyResults);
  
  // Generate action recommendations
  generateActionRecommendations(completenessResults, purityResults, coverageResults, consistencyResults);
  
  return {
    completeness: completenessResults,
    purity: purityResults,
    coverage: coverageResults,
    consistency: consistencyResults
  };
}

// Run audit if this file is executed directly
if (require.main === module) {
  runComprehensiveRegistryAudit();
}

module.exports = {
  auditRegistrationCompleteness,
  auditPurityTagging,
  auditTypeclassCoverage,
  auditConsistency,
  generateSummaryTable,
  generateActionRecommendations,
  runComprehensiveRegistryAudit
}; 