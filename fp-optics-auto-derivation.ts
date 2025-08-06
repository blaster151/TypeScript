/**
 * Automatic Optics Derivation System
 * 
 * Provides automatic derivation of lenses, prisms, isos, and traversals for all ADTs
 * in the registry, with full integration with the profunctor-powered optics system.
 * 
 * Features:
 * - Automatic Prism generation for each constructor
 * - Automatic Lens generation for each field inside constructors
 * - Automatic Traversal generation for collections
 * - Registry integration with metadata storage
 * - Full composability with existing optics
 * - Law-compliant implementations
 */

import {
  Lens, Prism, Iso, Traversal, Optional,
  lens, prism, iso, traversal, optional,
  view, set, over, preview, review, isMatching,
  compose, composeMany
} from './fp-optics';

import {
  getFPRegistry,
  getTypeclassInstance,
  getDerivableInstances
} from './fp-registry-init';

import {
  getADTMetadata
} from './fp-auto-derivation-complete';

// ============================================================================
// Part 1: Optics Metadata Types
// ============================================================================

/**
 * Optics metadata for registry storage
 */
export interface OpticsMetadata {
  name: string;
  adtName: string;
  opticType: 'Lens' | 'Prism' | 'Iso' | 'Traversal' | 'Optional';
  sourceType: string;
  targetType: string;
  typeParameters: string[];
  constructor?: string;
  field?: string;
  isCollection?: boolean;
  optic: any;
}

/**
 * ADT Optics collection
 */
export interface ADTOptics {
  // Constructor prisms
  [constructor: string]: Prism<any, any, any, any>;
  
  // Field lenses
  [field: string]: Lens<any, any, any, any>;
  
  // Collection traversals
  [collection: string]: Traversal<any, any, any, any>;
  
  // Utility methods
  constructor: (name: string) => Prism<any, any, any, any>;
  field: (name: string) => Lens<any, any, any, any>;
  collection: (name: string) => Traversal<any, any, any, any>;
  compose: (...optics: any[]) => any;
}

/**
 * Registry optics storage
 */
export interface OpticsRegistry {
  optics: Map<string, ADTOptics>;
  metadata: Map<string, OpticsMetadata[]>;
  
  // Registration methods
  registerOptics(adtName: string, optics: ADTOptics, metadata: OpticsMetadata[]): void;
  
  // Lookup methods
  getOptics(adtName: string): ADTOptics | undefined;
  getOpticsMetadata(adtName: string): OpticsMetadata[] | undefined;
  getAllOptics(): Map<string, ADTOptics>;
  
  // Utility methods
  deriveOpticsForADT(adtName: string): ADTOptics;
  deriveOpticsForAllADTs(): void;
}

// ============================================================================
// Part 2: Optics Registry Implementation
// ============================================================================

/**
 * Global optics registry
 */
class GlobalOpticsRegistry implements OpticsRegistry {
  public optics = new Map<string, ADTOptics>();
  public metadata = new Map<string, OpticsMetadata[]>();

  registerOptics(adtName: string, optics: ADTOptics, metadata: OpticsMetadata[]): void {
    this.optics.set(adtName, optics);
    this.metadata.set(adtName, metadata);
    console.log(`📐 Registered optics for ${adtName}: ${metadata.length} optics`);
  }

  getOptics(adtName: string): ADTOptics | undefined {
    return this.optics.get(adtName);
  }

  getOpticsMetadata(adtName: string): OpticsMetadata[] | undefined {
    return this.metadata.get(adtName);
  }

  getAllOptics(): Map<string, ADTOptics> {
    return this.optics;
  }

  deriveOpticsForADT(adtName: string): ADTOptics {
    const metadata = getADTMetadata(adtName);
    if (!metadata) {
      throw new Error(`No metadata found for ADT: ${adtName}`);
    }

    const optics: ADTOptics = {} as ADTOptics;
    const opticsMetadata: OpticsMetadata[] = [];

    // Generate constructor prisms
    for (const constructorName of metadata.constructors) {
      const prism = generateConstructorPrism(adtName, constructorName, metadata);
      optics[constructorName] = prism;
      
      opticsMetadata.push({
        name: `${adtName}.${constructorName}`,
        adtName,
        opticType: 'Prism',
        sourceType: adtName,
        targetType: `${adtName}.${constructorName}`,
        typeParameters: [],
        constructor: constructorName,
        optic: prism
      });
    }

    // Generate field lenses for each constructor
    for (const [constructorName, fields] of Object.entries(metadata.fieldTypes)) {
      for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        const lens = generateFieldLens(adtName, constructorName, fieldName, i, metadata);
        optics[fieldName] = lens;
        
        opticsMetadata.push({
          name: `${adtName}.${fieldName}`,
          adtName,
          opticType: 'Lens',
          sourceType: `${adtName}.${constructorName}`,
          targetType: fieldName,
          typeParameters: [],
          constructor: constructorName,
          field: fieldName,
          optic: lens
        });
      }
    }

    // Generate collection traversals if applicable
    if (isCollectionADT(metadata)) {
      const traversal = generateCollectionTraversal(adtName, metadata);
      optics['elements'] = traversal;
      
      opticsMetadata.push({
        name: `${adtName}.elements`,
        adtName,
        opticType: 'Traversal',
        sourceType: adtName,
        targetType: 'element',
        typeParameters: [],
        isCollection: true,
        optic: traversal
      });
    }

    // Add utility methods
    optics.constructor = (name: string) => optics[name] as Prism<any, any, any, any>;
    optics.field = (name: string) => optics[name] as Lens<any, any, any, any>;
    optics.collection = (name: string) => optics[name] as Traversal<any, any, any, any>;
    optics.compose = (...optics: any[]) => composeMany(optics);

    return optics;
  }

  deriveOpticsForAllADTs(): void {
    const registry = getFPRegistry();
    if (!registry) {
      console.warn('⚠️ FP Registry not available, skipping optics derivation');
      return;
    }

    // Get all registered ADTs
    const adtNames = Array.from(registry.derivable.keys());
    
    for (const adtName of adtNames) {
      try {
        const optics = this.deriveOpticsForADT(adtName);
        const metadata = this.metadata.get(adtName) || [];
        this.registerOptics(adtName, optics, metadata);
      } catch (error) {
        console.warn(`⚠️ Failed to derive optics for ${adtName}:`, error);
      }
    }

    console.log(`✅ Derived optics for ${adtNames.length} ADTs`);
  }
}

// ============================================================================
// Part 3: Optics Generation Functions
// ============================================================================

/**
 * Generate a prism for a constructor
 */
function generateConstructorPrism(
  adtName: string,
  constructorName: string,
  metadata: any
): Prism<any, any, any, any> {
  return prism(
    // match function
    (instance: any) => {
      if (instance.tag === constructorName) {
        return { left: instance.payload, right: instance };
      }
      return { left: instance, right: instance };
    },
    // build function
    (payload: any) => ({
      tag: constructorName,
      payload
    })
  );
}

/**
 * Generate a lens for a field
 */
function generateFieldLens(
  adtName: string,
  constructorName: string,
  fieldName: string,
  fieldIndex: number,
  metadata: any
): Lens<any, any, any, any> {
  return lens(
    // getter function
    (instance: any) => {
      if (instance.tag === constructorName) {
        if (typeof instance.payload === 'object' && instance.payload !== null) {
          return instance.payload[fieldName];
        }
        // Handle tuple-like payloads
        if (Array.isArray(instance.payload)) {
          return instance.payload[fieldIndex];
        }
        // Handle single value payloads
        return instance.payload;
      }
      throw new Error(`Cannot access field ${fieldName} on ${instance.tag}`);
    },
    // setter function
    (instance: any, value: any) => {
      if (instance.tag === constructorName) {
        if (typeof instance.payload === 'object' && instance.payload !== null) {
          return {
            ...instance,
            payload: {
              ...instance.payload,
              [fieldName]: value
            }
          };
        }
        // Handle tuple-like payloads
        if (Array.isArray(instance.payload)) {
          const newPayload = [...instance.payload];
          newPayload[fieldIndex] = value;
          return {
            ...instance,
            payload: newPayload
          };
        }
        // Handle single value payloads
        return {
          ...instance,
          payload: value
        };
      }
      return instance;
    }
  );
}

/**
 * Generate a traversal for collections
 */
function generateCollectionTraversal(
  adtName: string,
  metadata: any
): Traversal<any, any, any, any> {
  return traversal(
    (f: (a: any) => any, instance: any) => {
      // Handle different collection types
      if (Array.isArray(instance)) {
        return instance.map(f);
      }
      
      if (instance && typeof instance === 'object') {
        // Handle Maybe-like types
        if (instance.tag === 'Just' || instance.tag === 'Some') {
          return {
            ...instance,
            payload: f(instance.payload)
          };
        }
        
        // Handle Either-like types
        if (instance.tag === 'Right' || instance.tag === 'Ok') {
          return {
            ...instance,
            payload: f(instance.payload)
          };
        }
        
        // Handle List-like types
        if (instance.tag === 'Cons') {
          return {
            ...instance,
            payload: {
              ...instance.payload,
              head: f(instance.payload.head),
              tail: generateCollectionTraversal(adtName, metadata)(f, instance.payload.tail)
            }
          };
        }
      }
      
      return instance;
    }
  );
}

/**
 * Check if an ADT is a collection type
 */
function isCollectionADT(metadata: any): boolean {
  const collectionTypes = ['Array', 'List', 'Set', 'Map', 'Tree'];
  return collectionTypes.some(type => metadata.name.includes(type));
}

/**
 * Generate an isomorphism for simple transformations
 */
function generateIso<S, T, A, B>(
  to: (s: S) => A,
  from: (b: B) => T
): Iso<S, T, A, B> {
  return iso(to, from);
}

// ============================================================================
// Part 4: Enhanced Optics with Composition
// ============================================================================

/**
 * Enhanced optics with composition support
 */
export interface EnhancedOptic<S, T, A, B> {
  // Core optic
  optic: Lens<S, T, A, B> | Prism<S, T, A, B> | Traversal<S, T, A, B>;
  
  // Composition
  then<C, D>(next: Lens<A, B, C, D> | Prism<A, B, C, D> | Traversal<A, B, C, D>): EnhancedOptic<S, T, C, D>;
  
  // Utility methods
  get(source: S): A;
  set(value: B, source: S): T;
  modify(f: (a: A) => B, source: S): T;
}

/**
 * Create an enhanced optic
 */
export function enhancedOptic<S, T, A, B>(
  optic: Lens<S, T, A, B> | Prism<S, T, A, B> | Traversal<S, T, A, B>
): EnhancedOptic<S, T, A, B> {
  return {
    optic,
    
    then<C, D>(next: Lens<A, B, C, D> | Prism<A, B, C, D> | Traversal<A, B, C, D>): EnhancedOptic<S, T, C, D> {
      return enhancedOptic(compose(optic, next));
    },
    
    get(source: S): A {
      if (isLens(optic)) {
        return view(optic, source);
      }
      if (isPrism(optic)) {
        const result = preview(optic, source);
        if (result.tag === 'Just') {
          return result.payload;
        }
        throw new Error('Prism preview failed');
      }
      throw new Error('Cannot get from traversal');
    },
    
    set(value: B, source: S): T {
      if (isLens(optic)) {
        return set(optic, value, source);
      }
      if (isPrism(optic)) {
        return review(optic, value);
      }
      throw new Error('Cannot set on traversal');
    },
    
    modify(f: (a: A) => B, source: S): T {
      if (isLens(optic)) {
        return over(optic, f, source);
      }
      if (isPrism(optic)) {
        const result = preview(optic, source);
        if (result.tag === 'Just') {
          return review(optic, f(result.payload));
        }
        return source;
      }
      throw new Error('Cannot modify traversal');
    }
  };
}

// ============================================================================
// Part 5: Global Optics Registry Instance
// ============================================================================

/**
 * Global optics registry instance
 */
let globalOpticsRegistry: OpticsRegistry | undefined;

/**
 * Get or create the global optics registry
 */
export function getOpticsRegistry(): OpticsRegistry {
  if (!globalOpticsRegistry) {
    globalOpticsRegistry = new GlobalOpticsRegistry();
  }
  return globalOpticsRegistry;
}

/**
 * Initialize optics for all ADTs
 */
export function initializeOptics(): void {
  const registry = getOpticsRegistry();
  registry.deriveOpticsForAllADTs();
}

/**
 * Get optics for a specific ADT
 */
export function getADTOptics(adtName: string): ADTOptics | undefined {
  const registry = getOpticsRegistry();
  return registry.getOptics(adtName);
}

/**
 * Get optics metadata for a specific ADT
 */
export function getADTOpticsMetadata(adtName: string): OpticsMetadata[] | undefined {
  const registry = getOpticsRegistry();
  return registry.getOpticsMetadata(adtName);
}

// ============================================================================
// Part 6: Convenience Functions
// ============================================================================

/**
 * Create a lens for a field
 */
export function fieldLens<K extends string>(key: K) {
  return <S extends Record<K, any>, T extends Record<K, any>, A, B>(): Lens<S, T, A, B> => {
    return lens(
      (s: S) => s[key] as A,
      (s: S, b: B) => ({ ...s, [key]: b }) as T
    );
  };
}

/**
 * Create a prism for a constructor
 */
export function constructorPrism<Tag extends string>(tag: Tag) {
  return <S extends { tag: string; payload: any }, T extends { tag: string; payload: any }, A, B>(): Prism<S, T, A, B> => {
    return prism(
      (s: S) => {
        if (s.tag === tag) {
          return { left: s.payload as A, right: s as T };
        }
        return { left: s as T, right: s as T };
      },
      (b: B) => ({ tag, payload: b }) as T
    );
  };
}

/**
 * Create a traversal for arrays
 */
export function arrayTraversal<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B> {
  return traversal(
    (f: (a: A) => B, s: S) => s.map(f) as T
  );
}

/**
 * Create a traversal for objects
 */
export function objectTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal(
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const [key, value] of Object.entries(s)) {
        result[key as keyof T] = f(value as A) as T[keyof T];
      }
      return result;
    }
  );
}

// ============================================================================
// Part 7: Type Guards
// ============================================================================

/**
 * Type guard for lenses
 */
export function isLens<S, T, A, B>(value: any): value is Lens<S, T, A, B> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Type guard for prisms
 */
export function isPrism<S, T, A, B>(value: any): value is Prism<S, T, A, B> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Type guard for traversals
 */
export function isTraversal<S, T, A, B>(value: any): value is Traversal<S, T, A, B> {
  return typeof value === 'function' && value.length === 2;
}

// ============================================================================
// Part 8: Export Everything
// ============================================================================

export {
  // Core types
  OpticsMetadata,
  ADTOptics,
  OpticsRegistry,
  EnhancedOptic,
  
  // Registry functions
  getOpticsRegistry,
  initializeOptics,
  getADTOptics,
  getADTOpticsMetadata,
  
  // Generation functions
  generateConstructorPrism,
  generateFieldLens,
  generateCollectionTraversal,
  generateIso,
  
  // Enhanced optics
  enhancedOptic,
  
  // Convenience functions
  fieldLens,
  constructorPrism,
  arrayTraversal,
  objectTraversal,
  
  // Type guards
  isLens,
  isPrism,
  isTraversal
}; 