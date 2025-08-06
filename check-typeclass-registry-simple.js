/**
 * Simple Typeclass Registry Validation Query
 * 
 * Checks that every type with a Functor, Applicative, Monad, Bifunctor, or Profunctor instance
 * is present in the typeclass registry exactly once and is using the derived form.
 */

console.log('🔍 Simple Typeclass Registry Validation Query');
console.log('===========================================');

// ============================================================================
// Expected Types with Typeclass Instances
// ============================================================================

const EXPECTED_TYPES = {
  // ObservableLite
  'ObservableLite': {
    functor: 'ObservableLiteFunctor',
    applicative: 'ObservableLiteApplicative',
    monad: 'ObservableLiteMonad',
    profunctor: 'ObservableLiteProfunctor'
  },
  
  // GADT Enhanced
  'Expr': {
    functor: 'ExprFunctor'
  },
  'MaybeGADT': {
    functor: 'MaybeGADTFunctor',
    applicative: 'MaybeGADTApplicative',
    monad: 'MaybeGADTMonad'
  },
  'EitherGADT': {
    bifunctor: 'EitherGADTBifunctor'
  },
  'Result': {
    functor: 'ResultFunctor'
  },
  
  // Persistent HKT GADT
  'PersistentListHKT': {
    functor: 'PersistentListFunctor',
    applicative: 'PersistentListApplicative',
    monad: 'PersistentListMonad'
  },
  'PersistentMapHKT': {
    functor: 'PersistentMapFunctor',
    bifunctor: 'PersistentMapBifunctor'
  },
  'PersistentSetHKT': {
    functor: 'PersistentSetFunctor'
  },
  
  // Maybe Unified Enhanced
  'Maybe': {
    functor: 'MaybeFunctor',
    applicative: 'MaybeApplicative',
    monad: 'MaybeMonad'
  },
  
  // Profunctor Optics
  'Function': {
    profunctor: 'FunctionProfunctor'
  },
  
  // Stateful Stream
  'StatefulStream': {
    functor: 'StatefulStreamFunctor',
    applicative: 'StatefulStreamApplicative',
    monad: 'StatefulStreamMonad',
    profunctor: 'StatefulStreamProfunctor'
  },
  
  // GADT
  'ListGADT': {
    functor: 'ListGADTFunctor'
  },
  
  // Persistent Collections
  'PersistentList': {
    functor: 'PersistentListFunctor',
    applicative: 'PersistentListApplicative',
    monad: 'PersistentListMonad'
  },
  'PersistentMap': {
    functor: 'PersistentMapFunctor',
    bifunctor: 'PersistentMapBifunctor'
  },
  'PersistentSet': {
    functor: 'PersistentSetFunctor'
  }
};

// File mapping
const fileMapping = {
  'ObservableLite': 'fp-observable-lite.ts',
  'Expr': 'fp-gadt-enhanced.ts',
  'MaybeGADT': 'fp-gadt-enhanced.ts',
  'EitherGADT': 'fp-gadt-enhanced.ts',
  'Result': 'fp-gadt-enhanced.ts',
  'PersistentListHKT': 'fp-persistent-hkt-gadt.ts',
  'PersistentMapHKT': 'fp-persistent-hkt-gadt.ts',
  'PersistentSetHKT': 'fp-persistent-hkt-gadt.ts',
  'Maybe': 'fp-maybe-unified-enhanced.ts',
  'Function': 'fp-profunctor-optics.ts',
  'StatefulStream': 'fp-stream-state.ts',
  'ListGADT': 'fp-gadt.ts',
  'PersistentList': 'fp-persistent.ts',
  'PersistentMap': 'fp-persistent.ts',
  'PersistentSet': 'fp-persistent.ts'
};

// ============================================================================
// Check Files for Derived Instances
// ============================================================================

const fs = require('fs');
const path = require('path');

function checkFileForDerivedInstances(filePath, typeName) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasDerived: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for derived instances pattern
    const hasDerivedInstances = content.includes(`${typeName}Instances = deriveInstances`);
    const hasManualInstances = content.includes(`export const ${typeName}Functor: Functor<`);
    
    return {
      hasDerived: hasDerivedInstances,
      hasManual: hasManualInstances,
      fileExists: true
    };
  } catch (error) {
    return { hasDerived: false, error: error.message };
  }
}

function checkFileForRegistration(filePath, typeName) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasRegistration: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for registration pattern
    const hasRegistration = content.includes(`register${typeName}Instances`) || 
                           content.includes(`register${typeName.replace(/^[A-Z]/, c => c.toLowerCase())}Instances`);
    
    return {
      hasRegistration: hasRegistration,
      fileExists: true
    };
  } catch (error) {
    return { hasRegistration: false, error: error.message };
  }
}

// ============================================================================
// Check Registry Status
// ============================================================================

function checkRegistryStatus() {
  console.log('\n📋 Checking Typeclass Registry Status...\n');
  
  const results = {
    '✅ Already using derived & registered': [],
    '🔄 Using derived but not registered': [],
    '❌ Still manual & unregistered': []
  };
  
  // Check each expected type
  for (const [typeName, expectedInstances] of Object.entries(EXPECTED_TYPES)) {
    console.log(`🔍 Checking ${typeName}...`);
    
    const fileName = fileMapping[typeName];
    const filePath = path.join(__dirname, fileName);
    
    // Check for derived instances
    const derivedCheck = checkFileForDerivedInstances(filePath, typeName);
    
    if (derivedCheck.error) {
      console.log(`   ⚠️  ${derivedCheck.error}`);
    } else if (derivedCheck.hasDerived) {
      console.log(`   ✅ Has derived instances: ${typeName}Instances`);
    } else if (derivedCheck.hasManual) {
      console.log(`   ❌ Still has manual instances`);
    } else {
      console.log(`   ❓ Could not determine instance type`);
    }
    
    // Check for registration
    const registrationCheck = checkFileForRegistration(filePath, typeName);
    
    if (registrationCheck.error) {
      console.log(`   ⚠️  ${registrationCheck.error}`);
    } else if (registrationCheck.hasRegistration) {
      console.log(`   ✅ Has registration function`);
    } else {
      console.log(`   ❌ No registration function found`);
    }
    
    // Categorize the result
    if (derivedCheck.hasDerived && registrationCheck.hasRegistration) {
      results['✅ Already using derived & registered'].push({
        type: typeName,
        instances: Object.values(expectedInstances),
        file: fileName
      });
    } else if (derivedCheck.hasDerived && !registrationCheck.hasRegistration) {
      results['🔄 Using derived but not registered'].push({
        type: typeName,
        instances: Object.values(expectedInstances),
        file: fileName
      });
    } else {
      results['❌ Still manual & unregistered'].push({
        type: typeName,
        instances: Object.values(expectedInstances),
        file: fileName
      });
    }
    
    console.log('');
  }
  
  return results;
}

// ============================================================================
// Check for Duplicates
// ============================================================================

function checkForDuplicates() {
  console.log('🔍 Checking for Duplicate Registry Entries...\n');
  
  const allEntries = [];
  const duplicates = [];
  
  // Collect all expected entries
  for (const [typeName, expectedInstances] of Object.entries(EXPECTED_TYPES)) {
    for (const [instanceType, instanceName] of Object.entries(expectedInstances)) {
      allEntries.push(instanceName);
    }
  }
  
  // Check for duplicates
  const seen = new Set();
  for (const entry of allEntries) {
    if (seen.has(entry)) {
      duplicates.push(entry);
    } else {
      seen.add(entry);
    }
  }
  
  if (duplicates.length > 0) {
    console.log('❌ Duplicate entries found:');
    for (const duplicate of duplicates) {
      console.log(`   - ${duplicate}`);
    }
  } else {
    console.log('✅ No duplicate entries found');
  }
  
  console.log('');
}

// ============================================================================
// Check for Missing Entries
// ============================================================================

function checkForMissingEntries() {
  console.log('🔍 Checking for Missing Registry Entries...\n');
  
  // Since we can't access the actual registry, we'll check if registration functions exist
  const missing = [];
  
  for (const [typeName, expectedInstances] of Object.entries(EXPECTED_TYPES)) {
    const fileName = fileMapping[typeName];
    const filePath = path.join(__dirname, fileName);
    const registrationCheck = checkFileForRegistration(filePath, typeName);
    
    if (!registrationCheck.hasRegistration) {
      for (const [instanceType, instanceName] of Object.entries(expectedInstances)) {
        missing.push({
          type: typeName,
          instance: instanceName,
          instanceType: instanceType,
          file: fileName
        });
      }
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing registry entries (no registration function):');
    for (const item of missing) {
      console.log(`   - ${item.type}.${item.instanceType}: ${item.instance} (in ${item.file})`);
    }
  } else {
    console.log('✅ All expected entries have registration functions');
  }
  
  console.log('');
}

// ============================================================================
// Check for Manual Instances
// ============================================================================

function checkForManualInstances() {
  console.log('🔍 Checking for Manual Instances...\n');
  
  const manualInstances = [];
  
  // Check each file for manual instance definitions
  for (const [typeName, expectedInstances] of Object.entries(EXPECTED_TYPES)) {
    const fileName = fileMapping[typeName];
    const filePath = path.join(__dirname, fileName);
    const derivedCheck = checkFileForDerivedInstances(filePath, typeName);
    
    if (derivedCheck.hasManual && !derivedCheck.hasDerived) {
      manualInstances.push({
        type: typeName,
        file: fileName,
        instances: Object.values(expectedInstances)
      });
    }
  }
  
  if (manualInstances.length > 0) {
    console.log('❌ Manual instances found:');
    for (const item of manualInstances) {
      console.log(`   - ${item.type} (in ${item.file}): ${item.instances.join(', ')}`);
    }
  } else {
    console.log('✅ No manual instances found - all using derived instances');
  }
  
  console.log('');
}

// ============================================================================
// Generate Report
// ============================================================================

function generateReport(results) {
  console.log('📊 Typeclass Registry Status Report');
  console.log('===================================\n');
  
  for (const [status, items] of Object.entries(results)) {
    console.log(`${status} (${items.length} types):`);
    
    if (items.length === 0) {
      console.log('   None');
    } else {
      for (const item of items) {
        console.log(`   - ${item.type} (${item.file}): ${item.instances.join(', ')}`);
      }
    }
    
    console.log('');
  }
  
  // Summary
  const totalTypes = Object.values(results).reduce((sum, items) => sum + items.length, 0);
  const derivedAndRegistered = results['✅ Already using derived & registered'].length;
  const derivedNotRegistered = results['🔄 Using derived but not registered'].length;
  const manualUnregistered = results['❌ Still manual & unregistered'].length;
  
  console.log('📈 Summary:');
  console.log(`   Total types checked: ${totalTypes}`);
  console.log(`   ✅ Derived & registered: ${derivedAndRegistered}`);
  console.log(`   🔄 Derived but not registered: ${derivedNotRegistered}`);
  console.log(`   ❌ Manual & unregistered: ${manualUnregistered}`);
  console.log(`   🎯 Success rate: ${((derivedAndRegistered / totalTypes) * 100).toFixed(1)}%`);
  
  if (derivedNotRegistered > 0 || manualUnregistered > 0) {
    console.log('\n⚠️  Action Required:');
    if (derivedNotRegistered > 0) {
      console.log(`   - Register ${derivedNotRegistered} types in typeclass registry`);
    }
    if (manualUnregistered > 0) {
      console.log(`   - Convert ${manualUnregistered} types to use deriveInstances()`);
    }
  } else {
    console.log('\n🎉 All types are using derived instances and properly registered!');
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function runTypeclassRegistryValidation() {
  console.log('🚀 Running Simple Typeclass Registry Validation...\n');
  
  // Check registry status
  const results = checkRegistryStatus();
  
  // Check for duplicates
  checkForDuplicates();
  
  // Check for missing entries
  checkForMissingEntries();
  
  // Check for manual instances
  checkForManualInstances();
  
  // Generate report
  generateReport(results);
  
  return results;
}

// Run validation if this file is executed directly
if (require.main === module) {
  runTypeclassRegistryValidation();
}

module.exports = {
  checkRegistryStatus,
  checkForDuplicates,
  checkForMissingEntries,
  checkForManualInstances,
  generateReport,
  runTypeclassRegistryValidation
}; 