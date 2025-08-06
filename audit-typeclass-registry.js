/**
 * Typeclass Registry Audit
 * 
 * Audits the typeclass registry to ensure:
 * 1. Purity tagging is correct and complete
 * 2. Eq/Ord/Show derivations are implemented where applicable
 * 3. All instances are properly registered
 */

console.log('🔍 Typeclass Registry Audit');
console.log('==========================');

// ============================================================================
// Type Definitions with Expected Purity and Derivation Capabilities
// ============================================================================

const TYPE_AUDIT_DATA = {
  // ObservableLite - Effect type, can't derive Eq/Ord/Show
  'ObservableLite': {
    purity: 'Async',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    reason: 'Effect type with subscriptions and side effects',
    file: 'fp-observable-lite.ts'
  },
  
  // GADT Enhanced - Pure ADTs, can derive Eq/Ord/Show
  'Expr': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-gadt-enhanced.ts'
  },
  'MaybeGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-gadt-enhanced.ts'
  },
  'EitherGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-gadt-enhanced.ts'
  },
  'Result': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-gadt-enhanced.ts'
  },
  
  // Persistent HKT GADT - Pure ADTs, can derive Eq/Ord/Show
  'PersistentListHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent-hkt-gadt.ts'
  },
  'PersistentMapHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent-hkt-gadt.ts'
  },
  'PersistentSetHKT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent-hkt-gadt.ts'
  },
  
  // Maybe Unified Enhanced - Pure ADT, can derive Eq/Ord/Show
  'Maybe': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-maybe-unified-enhanced.ts'
  },
  
  // Profunctor Optics - Function type, can't derive Eq/Ord/Show
  'Function': {
    purity: 'Impure',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    reason: 'Function type with arbitrary behavior',
    file: 'fp-profunctor-optics.ts'
  },
  
  // Stateful Stream - Stateful type, can't derive Eq/Ord/Show
  'StatefulStream': {
    purity: 'State',
    canDeriveEq: false,
    canDeriveOrd: false,
    canDeriveShow: false,
    reason: 'Stateful stream with mutable state',
    file: 'fp-stream-state.ts'
  },
  
  // GADT - Pure ADTs, can derive Eq/Ord/Show
  'ListGADT': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-gadt.ts'
  },
  
  // Persistent Collections - Pure ADTs, can derive Eq/Ord/Show
  'PersistentList': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent.ts'
  },
  'PersistentMap': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent.ts'
  },
  'PersistentSet': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable data structure',
    file: 'fp-persistent.ts'
  },
  
  // Core ADTs - Pure ADTs, can derive Eq/Ord/Show
  'Either': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-either.ts'
  },
  'Result': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure algebraic data type',
    file: 'fp-result.ts'
  },
  'Array': {
    purity: 'Pure',
    canDeriveEq: true,
    canDeriveOrd: true,
    canDeriveShow: true,
    reason: 'Pure immutable array operations',
    file: 'fp-typeclasses-hkt.ts'
  }
};

// ============================================================================
// File System Operations
// ============================================================================

const fs = require('fs');
const path = require('path');

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
      new RegExp(`EffectTag\\.\\w+`, 'g')
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

function checkFileForDerivation(filePath, typeName, derivationType) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasDerivation: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for derivation patterns
    const derivationPatterns = {
      'Eq': new RegExp(`${typeName}Eq\\s*=\\s*deriveEqInstance`),
      'Ord': new RegExp(`${typeName}Ord\\s*=\\s*deriveOrdInstance`),
      'Show': new RegExp(`${typeName}Show\\s*=\\s*deriveShowInstance`)
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
      'Eq': new RegExp(`register.*${typeName}Eq`),
      'Ord': new RegExp(`register.*${typeName}Ord`),
      'Show': new RegExp(`register.*${typeName}Show`)
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

// ============================================================================
// Audit Functions
// ============================================================================

function auditPurityTags() {
  console.log('\n🔍 Auditing Purity Tags...\n');
  
  const results = {
    '✅ All good': [],
    '❌ Missing purity tag': []
  };
  
  for (const [typeName, auditData] of Object.entries(TYPE_AUDIT_DATA)) {
    console.log(`🔍 Checking ${typeName} purity...`);
    
    const filePath = path.join(__dirname, auditData.file);
    const purityCheck = checkFileForPurityTag(filePath, typeName);
    
    if (purityCheck.error) {
      console.log(`   ⚠️  ${purityCheck.error}`);
    } else if (purityCheck.hasPurity) {
      console.log(`   ✅ Has purity tag: ${purityCheck.foundPurity}`);
      results['✅ All good'].push({
        type: typeName,
        expectedPurity: auditData.purity,
        foundPurity: purityCheck.foundPurity,
        file: auditData.file
      });
    } else {
      console.log(`   ❌ Missing purity tag (expected: ${auditData.purity})`);
      results['❌ Missing purity tag'].push({
        type: typeName,
        expectedPurity: auditData.purity,
        file: auditData.file
      });
    }
    
    console.log('');
  }
  
  return results;
}

function auditEqOrdShowDerivations() {
  console.log('\n🔍 Auditing Eq/Ord/Show Derivations...\n');
  
  const results = {
    '✅ All good': [],
    '🔄 Missing Eq/Ord/Show derivation': [],
    'N/A - Cannot derive': []
  };
  
  for (const [typeName, auditData] of Object.entries(TYPE_AUDIT_DATA)) {
    console.log(`🔍 Checking ${typeName} derivations...`);
    
    const filePath = path.join(__dirname, auditData.file);
    const derivations = ['Eq', 'Ord', 'Show'];
    const derivationResults = {};
    
    let canDerive = auditData.canDeriveEq && auditData.canDeriveOrd && auditData.canDeriveShow;
    
    if (!canDerive) {
      console.log(`   N/A - Cannot derive: ${auditData.reason}`);
      results['N/A - Cannot derive'].push({
        type: typeName,
        reason: auditData.reason,
        file: auditData.file
      });
      console.log('');
      continue;
    }
    
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
      results['✅ All good'].push({
        type: typeName,
        derivations: derivationResults,
        file: auditData.file
      });
    } else {
      results['🔄 Missing Eq/Ord/Show derivation'].push({
        type: typeName,
        derivations: derivationResults,
        file: auditData.file
      });
    }
    
    console.log('');
  }
  
  return results;
}

// ============================================================================
// Generate Comprehensive Report
// ============================================================================

function generateAuditReport(purityResults, derivationResults) {
  console.log('📊 Typeclass Registry Audit Report');
  console.log('===================================\n');
  
  // Purity Tags Report
  console.log('🎯 Purity Tags Audit:');
  console.log('=====================');
  
  for (const [status, items] of Object.entries(purityResults)) {
    console.log(`\n${status} (${items.length} types):`);
    
    if (items.length === 0) {
      console.log('   None');
    } else {
      for (const item of items) {
        if (status === '✅ All good') {
          console.log(`   - ${item.type} (${item.file}): ${item.expectedPurity} ✅`);
        } else {
          console.log(`   - ${item.type} (${item.file}): Expected ${item.expectedPurity} ❌`);
        }
      }
    }
  }
  
  // Eq/Ord/Show Derivations Report
  console.log('\n🎯 Eq/Ord/Show Derivations Audit:');
  console.log('=================================');
  
  for (const [status, items] of Object.entries(derivationResults)) {
    console.log(`\n${status} (${items.length} types):`);
    
    if (items.length === 0) {
      console.log('   None');
    } else {
      for (const item of items) {
        if (status === '✅ All good') {
          console.log(`   - ${item.type} (${item.file}): Eq ✅ Ord ✅ Show ✅`);
        } else if (status === 'N/A - Cannot derive') {
          console.log(`   - ${item.type} (${item.file}): ${item.reason}`);
        } else {
          const missing = [];
          if (!item.derivations.Eq.hasDerivation) missing.push('Eq');
          if (!item.derivations.Ord.hasDerivation) missing.push('Ord');
          if (!item.derivations.Show.hasDerivation) missing.push('Show');
          console.log(`   - ${item.type} (${item.file}): Missing ${missing.join(', ')}`);
        }
      }
    }
  }
  
  // Summary Statistics
  console.log('\n📈 Summary Statistics:');
  console.log('=====================');
  
  const totalTypes = Object.keys(TYPE_AUDIT_DATA).length;
  const purityGood = purityResults['✅ All good'].length;
  const purityMissing = purityResults['❌ Missing purity tag'].length;
  const derivationsGood = derivationResults['✅ All good'].length;
  const derivationsMissing = derivationResults['🔄 Missing Eq/Ord/Show derivation'].length;
  const derivationsNA = derivationResults['N/A - Cannot derive'].length;
  
  console.log(`Total types audited: ${totalTypes}`);
  console.log(`Purity tags:`);
  console.log(`  ✅ Correct: ${purityGood}/${totalTypes} (${((purityGood/totalTypes)*100).toFixed(1)}%)`);
  console.log(`  ❌ Missing: ${purityMissing}/${totalTypes} (${((purityMissing/totalTypes)*100).toFixed(1)}%)`);
  console.log(`Eq/Ord/Show derivations:`);
  console.log(`  ✅ Complete: ${derivationsGood}/${totalTypes} (${((derivationsGood/totalTypes)*100).toFixed(1)}%)`);
  console.log(`  🔄 Missing: ${derivationsMissing}/${totalTypes} (${((derivationsMissing/totalTypes)*100).toFixed(1)}%)`);
  console.log(`  N/A Cannot derive: ${derivationsNA}/${totalTypes} (${((derivationsNA/totalTypes)*100).toFixed(1)}%)`);
  
  // Action Items
  console.log('\n⚠️  Action Items:');
  console.log('================');
  
  if (purityMissing > 0) {
    console.log(`- Add purity tags to ${purityMissing} types`);
  }
  
  if (derivationsMissing > 0) {
    console.log(`- Add Eq/Ord/Show derivations to ${derivationsMissing} types`);
  }
  
  if (purityMissing === 0 && derivationsMissing === 0) {
    console.log('- 🎉 All types have correct purity tags and derivations!');
  }
  
  console.log('\n📋 Detailed Breakdown by Type:');
  console.log('==============================');
  
  for (const [typeName, auditData] of Object.entries(TYPE_AUDIT_DATA)) {
    const purityStatus = purityResults['✅ All good'].find(item => item.type === typeName) ? '✅' : '❌';
    const derivationStatus = derivationResults['✅ All good'].find(item => item.type === typeName) ? '✅' : 
                            derivationResults['N/A - Cannot derive'].find(item => item.type === typeName) ? 'N/A' : '🔄';
    
    console.log(`${typeName} (${auditData.file}):`);
    console.log(`  Purity: ${purityStatus} (${auditData.purity})`);
    console.log(`  Eq/Ord/Show: ${derivationStatus} ${derivationStatus === 'N/A' ? `(${auditData.reason})` : ''}`);
    console.log('');
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function runTypeclassRegistryAudit() {
  console.log('🚀 Running Typeclass Registry Audit...\n');
  
  // Audit purity tags
  const purityResults = auditPurityTags();
  
  // Audit Eq/Ord/Show derivations
  const derivationResults = auditEqOrdShowDerivations();
  
  // Generate comprehensive report
  generateAuditReport(purityResults, derivationResults);
  
  return {
    purity: purityResults,
    derivations: derivationResults
  };
}

// Run audit if this file is executed directly
if (require.main === module) {
  runTypeclassRegistryAudit();
}

module.exports = {
  auditPurityTags,
  auditEqOrdShowDerivations,
  generateAuditReport,
  runTypeclassRegistryAudit
}; 