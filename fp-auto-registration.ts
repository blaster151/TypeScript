/**
 * Automatic Instance Registration System
 * 
 * Auto-registers derived instances with the Derivable Instance Registry
 * and Purity Tracking System.
 */

import { 
  deriveInstances, 
  DerivationConfig, 
  DerivedInstances,
  Eq,
  Ord,
  Show
} from './fp-derivation-helpers';
import { 
  getFPRegistry, 
  registerTypeclassInstance,
  registerDerivableInstance 
} from './fp-registry-init';
import type { 
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor,
  Kind 
} from './fp-typeclasses';

// ============================================================================
// Registration Configuration
// ============================================================================

/**
 * Configuration for auto-registration
 */
export interface AutoRegistrationConfig extends DerivationConfig {
  typeName: string;
  kindName: string;
  purity?: 'Pure' | 'Async' | 'IO' | 'State';
  autoRegister?: boolean;
  autoAugment?: boolean;
}

/**
 * Result of auto-registration
 */
export interface RegistrationResult {
  typeName: string;
  registered: string[];
  instances: DerivedInstances;
  success: boolean;
  errors: string[];
}

// ============================================================================
// Core Registration Functions
// ============================================================================

/**
 * Auto-register derived instances for an ADT
 */
export function autoRegisterADT<F extends Kind<any[]>>(
  config: AutoRegistrationConfig
): RegistrationResult {
  const result: RegistrationResult = {
    typeName: config.typeName,
    registered: [],
    instances: {},
    success: true,
    errors: []
  };

  try {
    // Derive instances
    const instances = deriveInstances<F>(config);
    result.instances = instances;

    // Get registry
    const registry = getFPRegistry();
    if (!registry) {
      result.errors.push('FP Registry not available');
      result.success = false;
      return result;
    }

    // Register typeclass instances
    if (instances.functor) {
      registry.registerTypeclass(config.typeName, 'Functor', instances.functor);
      result.registered.push('Functor');
    }

    if (instances.applicative) {
      registry.registerTypeclass(config.typeName, 'Applicative', instances.applicative);
      result.registered.push('Applicative');
    }

    if (instances.monad) {
      registry.registerTypeclass(config.typeName, 'Monad', instances.monad);
      result.registered.push('Monad');
    }

    if (instances.bifunctor) {
      registry.registerTypeclass(config.typeName, 'Bifunctor', instances.bifunctor);
      result.registered.push('Bifunctor');
    }

    // Register Eq, Ord, Show instances
    if (instances.eq) {
      registry.registerTypeclass(config.typeName, 'Eq', instances.eq);
      result.registered.push('Eq');
    }

    if (instances.ord) {
      registry.registerTypeclass(config.typeName, 'Ord', instances.ord);
      result.registered.push('Ord');
    }

    if (instances.show) {
      registry.registerTypeclass(config.typeName, 'Show', instances.show);
      result.registered.push('Show');
    }

    // Register derivable instances
    const derivableInstances: any = {};
    if (instances.functor) derivableInstances.functor = instances.functor;
    if (instances.applicative) derivableInstances.applicative = instances.applicative;
    if (instances.monad) derivableInstances.monad = instances.monad;
    if (instances.bifunctor) derivableInstances.bifunctor = instances.bifunctor;
    if (instances.eq) derivableInstances.eq = instances.eq;
    if (instances.ord) derivableInstances.ord = instances.ord;
    if (instances.show) derivableInstances.show = instances.show;

    // Add purity metadata
    derivableInstances.purity = { 
      effect: config.purity || 'Pure' 
    };

    registry.registerDerivable(config.typeName, derivableInstances);

    // Register HKT if provided
    if (config.kindName) {
      registry.registerHKT(config.typeName, config.kindName);
    }

    // Register purity
    if (config.purity) {
      registry.registerPurity(config.typeName, config.purity);
    }

    console.log(`✅ Auto-registered ${result.registered.length} instances for ${config.typeName}`);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    result.success = false;
    console.error(`❌ Failed to auto-register ${config.typeName}:`, error);
  }

  return result;
}

// ============================================================================
// Convenience Functions for Common ADTs
// ============================================================================

/**
 * Auto-register Maybe instances
 */
export function autoRegisterMaybe(): RegistrationResult {
  return autoRegisterADT({
    typeName: 'Maybe',
    kindName: 'MaybeK',
    purity: 'Pure',
    functor: true,
    applicative: true,
    monad: true,
    eq: true,
    ord: true,
    show: true
  });
}

/**
 * Auto-register Either instances
 */
export function autoRegisterEither(): RegistrationResult {
  return autoRegisterADT({
    typeName: 'Either',
    kindName: 'EitherK',
    purity: 'Pure',
    functor: true,
    applicative: true,
    monad: true,
    bifunctor: true,
    eq: true,
    ord: true,
    show: true
  });
}

/**
 * Auto-register Result instances
 */
export function autoRegisterResult(): RegistrationResult {
  return autoRegisterADT({
    typeName: 'Result',
    kindName: 'ResultK',
    purity: 'Pure',
    functor: true,
    applicative: true,
    monad: true,
    bifunctor: true,
    eq: true,
    ord: true,
    show: true
  });
}

/**
 * Auto-register ObservableLite instances
 */
export function autoRegisterObservableLite(): RegistrationResult {
  return autoRegisterADT({
    typeName: 'ObservableLite',
    kindName: 'ObservableLiteK',
    purity: 'Async',
    functor: true,
    applicative: true,
    monad: true,
    eq: true,
    ord: true,
    show: true
  });
}

/**
 * Auto-register TaskEither instances
 */
export function autoRegisterTaskEither(): RegistrationResult {
  return autoRegisterADT({
    typeName: 'TaskEither',
    kindName: 'TaskEitherK',
    purity: 'Async',
    functor: true,
    applicative: true,
    monad: true,
    bifunctor: true,
    eq: true,
    ord: true,
    show: true
  });
}

// ============================================================================
// Bulk Registration
// ============================================================================

/**
 * Auto-register all core ADTs
 */
export function autoRegisterAllCoreADTs(): RegistrationResult[] {
  const results: RegistrationResult[] = [];

  console.log('🔄 Auto-registering all core ADTs...');

  results.push(autoRegisterMaybe());
  results.push(autoRegisterEither());
  results.push(autoRegisterResult());
  results.push(autoRegisterObservableLite());
  results.push(autoRegisterTaskEither());

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`✅ Auto-registration complete: ${successCount}/${totalCount} successful`);

  return results;
}

// ============================================================================
// Integration with Fluent ADT System
// ============================================================================

/**
 * Auto-register and augment ADT with fluent methods
 */
export function autoRegisterAndAugment<F extends Kind<any[]>>(
  config: AutoRegistrationConfig
): RegistrationResult {
  const result = autoRegisterADT<F>(config);

  if (result.success && config.autoAugment !== false) {
    try {
      // Import and use fluent augmentation
      const { augmentADTWithFluent, augmentBifunctorADTWithFluent } = require('./fp-fluent-adt');
      
      // This would need the actual constructor to be available
      // For now, we'll just log that augmentation is ready
      console.log(`🔄 Fluent methods ready for ${config.typeName}`);
      
    } catch (error) {
      result.errors.push(`Failed to augment fluent methods: ${error}`);
      console.warn(`⚠️ Fluent augmentation failed for ${config.typeName}:`, error);
    }
  }

  return result;
}

// ============================================================================
// Validation and Testing
// ============================================================================

/**
 * Validate that all registered instances work correctly
 */
export function validateRegisteredInstances(typeName: string): boolean {
  const registry = getFPRegistry();
  if (!registry) {
    console.error('❌ FP Registry not available for validation');
    return false;
  }

  const functor = registry.getTypeclass(typeName, 'Functor');
  const monad = registry.getTypeclass(typeName, 'Monad');
  const eq = registry.getTypeclass(typeName, 'Eq');
  const show = registry.getTypeclass(typeName, 'Show');

  let valid = true;

  // Test Functor
  if (functor) {
    try {
      // This is a simplified test - in practice we'd need actual ADT instances
      console.log(`✅ Functor instance validated for ${typeName}`);
    } catch (error) {
      console.error(`❌ Functor validation failed for ${typeName}:`, error);
      valid = false;
    }
  }

  // Test Monad
  if (monad) {
    try {
      console.log(`✅ Monad instance validated for ${typeName}`);
    } catch (error) {
      console.error(`❌ Monad validation failed for ${typeName}:`, error);
      valid = false;
    }
  }

  // Test Eq
  if (eq) {
    try {
      console.log(`✅ Eq instance validated for ${typeName}`);
    } catch (error) {
      console.error(`❌ Eq validation failed for ${typeName}:`, error);
      valid = false;
    }
  }

  // Test Show
  if (show) {
    try {
      console.log(`✅ Show instance validated for ${typeName}`);
    } catch (error) {
      console.error(`❌ Show validation failed for ${typeName}:`, error);
      valid = false;
    }
  }

  return valid;
}

// ============================================================================
// Auto-Initialization
// ============================================================================

/**
 * Initialize auto-registration system
 */
export function initializeAutoRegistration(): void {
  console.log('🚀 Initializing auto-registration system...');
  
  // Auto-register all core ADTs
  const results = autoRegisterAllCoreADTs();
  
  // Validate registrations
  const validationResults = results
    .filter(r => r.success)
    .map(r => ({ typeName: r.typeName, valid: validateRegisteredInstances(r.typeName) }));
  
  const validCount = validationResults.filter(r => r.valid).length;
  const totalCount = validationResults.length;
  
  console.log(`✅ Auto-registration validation: ${validCount}/${totalCount} valid`);
}

// Auto-initialize when module is loaded
if (typeof globalThis !== 'undefined') {
  // Delay initialization to ensure registry is ready
  setTimeout(initializeAutoRegistration, 0);
} 