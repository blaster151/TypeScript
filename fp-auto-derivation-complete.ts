/**
 * Complete Automatic Derivation System for All ADTs
 * 
 * Provides automatic derivation of Eq, Ord, and Show instances for all ADTs:
 * - Maybe, Either, Result
 * - PersistentList, PersistentMap, PersistentSet
 * - Tree, ObservableLite, GADT variants
 * - And any future ADTs registered in the system
 * 
 * Integrates with existing derivation system and registry for seamless operation.
 */

import { 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance,
  deriveInstances,
  Eq,
  Ord,
  Show,
  DerivationConfig
} from './fp-derivation-helpers';

import { 
  getFPRegistry, 
  getTypeclassInstance, 
  getDerivableInstances 
} from './fp-registry-init';

// ============================================================================
// Part 1: ADT Metadata and Analysis
// ============================================================================

/**
 * ADT metadata for automatic derivation
 */
export interface ADTMetadata {
  name: string;
  constructors: string[];
  isSumType: boolean;
  isProductType: boolean;
  hasMatch: boolean;
  hasTag: boolean;
  fieldTypes: Record<string, any[]>;
  customEq?: (a: any, b: any) => boolean;
  customOrd?: (a: any, b: any) => number;
  customShow?: (a: any) => string;
}

/**
 * Registry of ADT metadata for automatic derivation
 */
export const ADT_METADATA_REGISTRY = new Map<string, ADTMetadata>();

/**
 * Register ADT metadata for automatic derivation
 */
export function registerADTMetadata(name: string, metadata: ADTMetadata): void {
  ADT_METADATA_REGISTRY.set(name, metadata);
  console.log(`📝 Registered ADT metadata for ${name}`);
}

/**
 * Get ADT metadata for derivation
 */
export function getADTMetadata(name: string): ADTMetadata | undefined {
  return ADT_METADATA_REGISTRY.get(name);
}

// ============================================================================
// Part 2: Automatic Derivation Functions
// ============================================================================

/**
 * Automatically derive Eq instance for an ADT
 */
export function autoDeriveEq<A>(adtName: string, config: DerivationConfig = {}): Eq<A> {
  const metadata = getADTMetadata(adtName);
  const registry = getFPRegistry();
  
  if (!metadata) {
    console.warn(`⚠️ No metadata found for ${adtName}, using fallback Eq`);
    return createFallbackEq<A>();
  }
  
  // Check if instance already exists in registry
  const existingInstance = registry?.getTypeclass(adtName, 'Eq');
  if (existingInstance) {
    console.log(`✅ Using existing Eq instance for ${adtName}`);
    return existingInstance;
  }
  
  // Derive new instance
  const derivedInstance = deriveEqInstance<A>({
    ...config,
    customEq: metadata.customEq || config.customEq
  });
  
  // Register the derived instance
  if (registry) {
    registry.registerTypeclass(adtName, 'Eq', derivedInstance);
    console.log(`✅ Auto-derived and registered Eq instance for ${adtName}`);
  }
  
  return derivedInstance;
}

/**
 * Automatically derive Ord instance for an ADT
 */
export function autoDeriveOrd<A>(adtName: string, config: DerivationConfig = {}): Ord<A> {
  const metadata = getADTMetadata(adtName);
  const registry = getFPRegistry();
  
  if (!metadata) {
    console.warn(`⚠️ No metadata found for ${adtName}, using fallback Ord`);
    return createFallbackOrd<A>();
  }
  
  // Check if instance already exists in registry
  const existingInstance = registry?.getTypeclass(adtName, 'Ord');
  if (existingInstance) {
    console.log(`✅ Using existing Ord instance for ${adtName}`);
    return existingInstance;
  }
  
  // Derive new instance
  const derivedInstance = deriveOrdInstance<A>({
    ...config,
    customOrd: metadata.customOrd || config.customOrd
  });
  
  // Register the derived instance
  if (registry) {
    registry.registerTypeclass(adtName, 'Ord', derivedInstance);
    console.log(`✅ Auto-derived and registered Ord instance for ${adtName}`);
  }
  
  return derivedInstance;
}

/**
 * Automatically derive Show instance for an ADT
 */
export function autoDeriveShow<A>(adtName: string, config: DerivationConfig = {}): Show<A> {
  const metadata = getADTMetadata(adtName);
  const registry = getFPRegistry();
  
  if (!metadata) {
    console.warn(`⚠️ No metadata found for ${adtName}, using fallback Show`);
    return createFallbackShow<A>();
  }
  
  // Check if instance already exists in registry
  const existingInstance = registry?.getTypeclass(adtName, 'Show');
  if (existingInstance) {
    console.log(`✅ Using existing Show instance for ${adtName}`);
    return existingInstance;
  }
  
  // Derive new instance
  const derivedInstance = deriveShowInstance<A>({
    ...config,
    customShow: metadata.customShow || config.customShow
  });
  
  // Register the derived instance
  if (registry) {
    registry.registerTypeclass(adtName, 'Show', derivedInstance);
    console.log(`✅ Auto-derived and registered Show instance for ${adtName}`);
  }
  
  return derivedInstance;
}

/**
 * Automatically derive all instances for an ADT
 */
export function autoDeriveAllInstances<A>(
  adtName: string, 
  config: DerivationConfig = {}
): { eq: Eq<A>; ord: Ord<A>; show: Show<A> } {
  console.log(`🔧 Auto-deriving all instances for ${adtName}...`);
  
  const eq = autoDeriveEq<A>(adtName, config);
  const ord = autoDeriveOrd<A>(adtName, config);
  const show = autoDeriveShow<A>(adtName, config);
  
  console.log(`✅ Auto-derived all instances for ${adtName}`);
  
  return { eq, ord, show };
}

// ============================================================================
// Part 3: Fallback Implementations
// ============================================================================

/**
 * Create fallback Eq instance (identity equality)
 */
export function createFallbackEq<A>(): Eq<A> {
  return {
    equals: (a: A, b: A): boolean => a === b
  };
}

/**
 * Create fallback Ord instance (always returns 0)
 */
export function createFallbackOrd<A>(): Ord<A> {
  return {
    equals: (a: A, b: A): boolean => a === b,
    compare: (a: A, b: A): number => 0
  };
}

/**
 * Create fallback Show instance (minimal debug string)
 */
export function createFallbackShow<A>(): Show<A> {
  return {
    show: (a: A): string => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return `[Object ${a.constructor?.name || 'Unknown'}]`;
        }
      }
      return String(a);
    }
  };
}

// ============================================================================
// Part 4: ADT-Specific Metadata Registration
// ============================================================================

/**
 * Register metadata for Maybe ADT
 */
export function registerMaybeMetadata(): void {
  registerADTMetadata('Maybe', {
    name: 'Maybe',
    constructors: ['Just', 'Nothing'],
    isSumType: true,
    isProductType: false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: {
      Just: ['value'],
      Nothing: []
    },
    customEq: (a: any, b: any): boolean => {
      if (a._tag !== b._tag) return false;
      if (a._tag === 'Just') return a.value === b.value;
      return true; // Both Nothing
    },
    customOrd: (a: any, b: any): number => {
      if (a._tag === 'Nothing' && b._tag === 'Nothing') return 0;
      if (a._tag === 'Nothing') return -1;
      if (b._tag === 'Nothing') return 1;
      return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
    },
    customShow: (a: any): string => {
      if (a._tag === 'Just') return `Just(${a.value})`;
      return 'Nothing';
    }
  });
}

/**
 * Register metadata for Either ADT
 */
export function registerEitherMetadata(): void {
  registerADTMetadata('Either', {
    name: 'Either',
    constructors: ['Left', 'Right'],
    isSumType: true,
    isProductType: false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: {
      Left: ['value'],
      Right: ['value']
    },
    customEq: (a: any, b: any): boolean => {
      if (a._tag !== b._tag) return false;
      return a.value === b.value;
    },
    customOrd: (a: any, b: any): number => {
      if (a._tag === 'Left' && b._tag === 'Left') {
        return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      }
      if (a._tag === 'Right' && b._tag === 'Right') {
        return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      }
      return a._tag === 'Left' ? -1 : 1; // Left < Right
    },
    customShow: (a: any): string => {
      return `${a._tag}(${a.value})`;
    }
  });
}

/**
 * Register metadata for Result ADT
 */
export function registerResultMetadata(): void {
  registerADTMetadata('Result', {
    name: 'Result',
    constructors: ['Ok', 'Err'],
    isSumType: true,
    isProductType: false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: {
      Ok: ['value'],
      Err: ['error']
    },
    customEq: (a: any, b: any): boolean => {
      if (a._tag !== b._tag) return false;
      if (a._tag === 'Ok') return a.value === b.value;
      return a.error === b.error;
    },
    customOrd: (a: any, b: any): number => {
      if (a._tag === 'Err' && b._tag === 'Err') {
        return a.error < b.error ? -1 : a.error > b.error ? 1 : 0;
      }
      if (a._tag === 'Ok' && b._tag === 'Ok') {
        return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      }
      return a._tag === 'Err' ? -1 : 1; // Err < Ok
    },
    customShow: (a: any): string => {
      if (a._tag === 'Ok') return `Ok(${a.value})`;
      return `Err(${a.error})`;
    }
  });
}

/**
 * Register metadata for PersistentList ADT
 */
export function registerPersistentListMetadata(): void {
  registerADTMetadata('PersistentList', {
    name: 'PersistentList',
    constructors: ['Cons', 'Nil'],
    isSumType: true,
    isProductType: false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: {
      Cons: ['head', 'tail'],
      Nil: []
    },
    customEq: (a: any, b: any): boolean => {
      if (a._tag !== b._tag) return false;
      if (a._tag === 'Nil') return true;
      return a.head === b.head && a.tail.equals(b.tail);
    },
    customOrd: (a: any, b: any): number => {
      if (a._tag === 'Nil' && b._tag === 'Nil') return 0;
      if (a._tag === 'Nil') return -1;
      if (b._tag === 'Nil') return 1;
      const headCompare = a.head < b.head ? -1 : a.head > b.head ? 1 : 0;
      if (headCompare !== 0) return headCompare;
      return a.tail.compare(b.tail);
    },
    customShow: (a: any): string => {
      if (a._tag === 'Nil') return '[]';
      return `[${a.head}, ...${a.tail.show()}]`;
    }
  });
}

/**
 * Register metadata for PersistentMap ADT
 */
export function registerPersistentMapMetadata(): void {
  registerADTMetadata('PersistentMap', {
    name: 'PersistentMap',
    constructors: ['Map'],
    isSumType: false,
    isProductType: true,
    hasMatch: true,
    hasTag: false,
    fieldTypes: {
      Map: ['entries']
    },
    customEq: (a: any, b: any): boolean => {
      if (a.entries.length !== b.entries.length) return false;
      for (let i = 0; i < a.entries.length; i++) {
        if (a.entries[i][0] !== b.entries[i][0] || a.entries[i][1] !== b.entries[i][1]) {
          return false;
        }
      }
      return true;
    },
    customOrd: (a: any, b: any): number => {
      if (a.entries.length !== b.entries.length) {
        return a.entries.length < b.entries.length ? -1 : 1;
      }
      for (let i = 0; i < a.entries.length; i++) {
        const keyCompare = a.entries[i][0] < b.entries[i][0] ? -1 : 
                          a.entries[i][0] > b.entries[i][0] ? 1 : 0;
        if (keyCompare !== 0) return keyCompare;
        const valueCompare = a.entries[i][1] < b.entries[i][1] ? -1 : 
                           a.entries[i][1] > b.entries[i][1] ? 1 : 0;
        if (valueCompare !== 0) return valueCompare;
      }
      return 0;
    },
    customShow: (a: any): string => {
      const entries = a.entries.map(([k, v]: [any, any]) => `${k}: ${v}`).join(', ');
      return `{${entries}}`;
    }
  });
}

/**
 * Register metadata for PersistentSet ADT
 */
export function registerPersistentSetMetadata(): void {
  registerADTMetadata('PersistentSet', {
    name: 'PersistentSet',
    constructors: ['Set'],
    isSumType: false,
    isProductType: true,
    hasMatch: true,
    hasTag: false,
    fieldTypes: {
      Set: ['values']
    },
    customEq: (a: any, b: any): boolean => {
      if (a.values.length !== b.values.length) return false;
      for (let i = 0; i < a.values.length; i++) {
        if (a.values[i] !== b.values[i]) return false;
      }
      return true;
    },
    customOrd: (a: any, b: any): number => {
      if (a.values.length !== b.values.length) {
        return a.values.length < b.values.length ? -1 : 1;
      }
      for (let i = 0; i < a.values.length; i++) {
        const compare = a.values[i] < b.values[i] ? -1 : 
                       a.values[i] > b.values[i] ? 1 : 0;
        if (compare !== 0) return compare;
      }
      return 0;
    },
    customShow: (a: any): string => {
      return `{${a.values.join(', ')}}`;
    }
  });
}

/**
 * Register metadata for Tree ADT
 */
export function registerTreeMetadata(): void {
  registerADTMetadata('Tree', {
    name: 'Tree',
    constructors: ['Leaf', 'Node'],
    isSumType: true,
    isProductType: false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: {
      Leaf: ['value'],
      Node: ['value', 'left', 'right']
    },
    customEq: (a: any, b: any): boolean => {
      if (a._tag !== b._tag) return false;
      if (a._tag === 'Leaf') return a.value === b.value;
      return a.value === b.value && a.left.equals(b.left) && a.right.equals(b.right);
    },
    customOrd: (a: any, b: any): number => {
      if (a._tag === 'Leaf' && b._tag === 'Leaf') {
        return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      }
      if (a._tag === 'Node' && b._tag === 'Node') {
        const valueCompare = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
        if (valueCompare !== 0) return valueCompare;
        const leftCompare = a.left.compare(b.left);
        if (leftCompare !== 0) return leftCompare;
        return a.right.compare(b.right);
      }
      return a._tag === 'Leaf' ? -1 : 1; // Leaf < Node
    },
    customShow: (a: any): string => {
      if (a._tag === 'Leaf') return `Leaf(${a.value})`;
      return `Node(${a.value}, ${a.left.show()}, ${a.right.show()})`;
    }
  });
}

/**
 * Register metadata for ObservableLite ADT
 */
export function registerObservableLiteMetadata(): void {
  registerADTMetadata('ObservableLite', {
    name: 'ObservableLite',
    constructors: ['ObservableLite'],
    isSumType: false,
    isProductType: true,
    hasMatch: true,
    hasTag: false,
    fieldTypes: {
      ObservableLite: ['subscribers', 'currentValue']
    },
    customEq: (a: any, b: any): boolean => {
      return a.currentValue === b.currentValue;
    },
    customOrd: (a: any, b: any): number => {
      return a.currentValue < b.currentValue ? -1 : 
             a.currentValue > b.currentValue ? 1 : 0;
    },
    customShow: (a: any): string => {
      return `ObservableLite(${a.currentValue})`;
    }
  });
}

// ============================================================================
// Part 5: Bulk Registration and Initialization
// ============================================================================

/**
 * Register metadata for all core ADTs
 */
export function registerAllADTMetadata(): void {
  console.log('📝 Registering metadata for all core ADTs...');
  
  registerMaybeMetadata();
  registerEitherMetadata();
  registerResultMetadata();
  registerPersistentListMetadata();
  registerPersistentMapMetadata();
  registerPersistentSetMetadata();
  registerTreeMetadata();
  registerObservableLiteMetadata();
  
  console.log(`✅ Registered metadata for ${ADT_METADATA_REGISTRY.size} ADTs`);
}

/**
 * Auto-derive instances for all registered ADTs
 */
export function autoDeriveAllADTInstances(): void {
  console.log('🔧 Auto-deriving instances for all registered ADTs...');
  
  const adtNames = Array.from(ADT_METADATA_REGISTRY.keys());
  
  for (const adtName of adtNames) {
    try {
      autoDeriveAllInstances(adtName);
    } catch (error) {
      console.warn(`⚠️ Failed to auto-derive instances for ${adtName}:`, error);
    }
  }
  
  console.log(`✅ Auto-derived instances for ${adtNames.length} ADTs`);
}

/**
 * Initialize complete automatic derivation system
 */
export function initializeAutoDerivation(): void {
  console.log('🚀 Initializing complete automatic derivation system...');
  
  // Register metadata for all ADTs
  registerAllADTMetadata();
  
  // Auto-derive instances for all ADTs
  autoDeriveAllADTInstances();
  
  console.log('🎉 Complete automatic derivation system initialized!');
}

// ============================================================================
// Part 6: Helper Functions for Custom ADTs
// ============================================================================

/**
 * Helper to register custom ADT metadata
 */
export function registerCustomADT(
  name: string,
  constructors: string[],
  options: {
    isSumType?: boolean;
    isProductType?: boolean;
    fieldTypes?: Record<string, any[]>;
    customEq?: (a: any, b: any) => boolean;
    customOrd?: (a: any, b: any) => number;
    customShow?: (a: any) => string;
  } = {}
): void {
  const metadata: ADTMetadata = {
    name,
    constructors,
    isSumType: options.isSumType ?? true,
    isProductType: options.isProductType ?? false,
    hasMatch: true,
    hasTag: true,
    fieldTypes: options.fieldTypes ?? {},
    customEq: options.customEq,
    customOrd: options.customOrd,
    customShow: options.customShow
  };
  
  registerADTMetadata(name, metadata);
  
  // Auto-derive instances immediately
  autoDeriveAllInstances(name);
}

/**
 * Helper to get derived instances for any ADT
 */
export function getDerivedInstances<A>(adtName: string): {
  eq: Eq<A>;
  ord: Ord<A>;
  show: Show<A>;
} {
  const registry = getFPRegistry();
  
  if (!registry) {
    throw new Error('FP Registry not initialized');
  }
  
  const eq = registry.getTypeclass(adtName, 'Eq') || autoDeriveEq<A>(adtName);
  const ord = registry.getTypeclass(adtName, 'Ord') || autoDeriveOrd<A>(adtName);
  const show = registry.getTypeclass(adtName, 'Show') || autoDeriveShow<A>(adtName);
  
  return { eq, ord, show };
}

// ============================================================================
// Part 7: Export Everything
// ============================================================================

export {
  // Core auto-derivation functions
  autoDeriveEq,
  autoDeriveOrd,
  autoDeriveShow,
  autoDeriveAllInstances,
  
  // Fallback implementations
  createFallbackEq,
  createFallbackOrd,
  createFallbackShow,
  
  // Metadata management
  registerADTMetadata,
  getADTMetadata,
  ADT_METADATA_REGISTRY,
  
  // Bulk operations
  registerAllADTMetadata,
  autoDeriveAllADTInstances,
  initializeAutoDerivation,
  
  // Helper functions
  registerCustomADT,
  getDerivedInstances
}; 