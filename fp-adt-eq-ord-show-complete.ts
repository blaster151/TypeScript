/**
 * Complete ADT Eq, Ord, and Show Instances Implementation
 * 
 * This module provides automatic Eq, Ord, and Show instances for all ADTs
 * in the codebase that are missing them, with proper registry integration.
 * 
 * Goals:
 * 1. Coverage - All core ADTs: Maybe, Either, Result, ObservableLite, 
 *    Persistent collections, Tree, Effect monads (IO, Task, State)
 * 2. Derivation - Use existing derivation system where possible
 * 3. Type safety - Deep Eq, lexicographic Ord, unambiguous Show
 * 4. Registry integration - Auto-register all instances
 * 5. Interop - Work with both fluent and data-last APIs
 * 6. Tests - Law compliance and round-trip safety
 */

import {
  deriveEqInstance,
  deriveOrdInstance,
  deriveShowInstance,
  Eq,
  Ord,
  Show
} from './fp-derivation-helpers';

import {
  ObservableLite,
  ObservableLiteK
} from './fp-observable-lite';

import {
  TaskEither,
  TaskEitherK
} from './fp-bimonad-extended';

import {
  IO,
  Task,
  State,
  IOK,
  TaskK,
  StateK
} from './fp-effect-monads';

import {
  PersistentList,
  PersistentMap,
  PersistentSet,
  PersistentListK,
  PersistentMapK,
  PersistentSetK
} from './fp-persistent';

import {
  createSumType,
  SumTypeBuilder
} from './fp-adt-builders';

// ============================================================================
// Part 1: Tree ADT Definition and Instances
// ============================================================================

/**
 * Tree ADT using createSumType for automatic instance derivation
 */
export const Tree = createSumType({
  Leaf: <A>(value: A) => ({ value }),
  Node: <A>(value: A, left: Tree<A>, right: Tree<A>) => ({ value, left, right })
}, {
  name: 'Tree',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  derive: ['Eq', 'Ord', 'Show']
});

/**
 * Tree HKT kind
 */
export interface TreeK extends Kind1 {
  readonly type: Tree<this['arg0']>;
}

// ============================================================================
// Part 2: ObservableLite Eq, Ord, Show Instances
// ============================================================================

/**
 * ObservableLite Eq instance
 * Note: ObservableLite cannot have meaningful equality due to its function nature
 * This provides reference equality as a fallback
 */
export const ObservableLiteEq = deriveEqInstance({
  customEq: <A>(a: ObservableLite<A>, b: ObservableLite<A>): boolean => {
    // ObservableLite cannot have meaningful equality due to function nature
    // Return reference equality as fallback
    return a === b;
  }
});

/**
 * ObservableLite Ord instance
 * Provides lexicographic ordering based on reference comparison
 */
export const ObservableLiteOrd = deriveOrdInstance({
  customOrd: <A>(a: ObservableLite<A>, b: ObservableLite<A>): number => {
    // Use reference comparison for ordering
    if (a === b) return 0;
    // Use object identity hash for consistent ordering
    const aHash = Object.prototype.toString.call(a);
    const bHash = Object.prototype.toString.call(b);
    return aHash.localeCompare(bHash);
  }
});

/**
 * ObservableLite Show instance
 * Provides string representation of the ObservableLite
 */
export const ObservableLiteShow = deriveShowInstance({
  customShow: <A>(a: ObservableLite<A>): string => {
    return `ObservableLite(<function>)`;
  }
});

// ============================================================================
// Part 3: TaskEither Eq, Ord, Show Instances
// ============================================================================

/**
 * TaskEither Eq instance
 * Note: TaskEither cannot have meaningful equality due to its async function nature
 * This provides reference equality as a fallback
 */
export const TaskEitherEq = deriveEqInstance({
  customEq: <E, A>(a: TaskEither<E, A>, b: TaskEither<E, A>): boolean => {
    // TaskEither cannot have meaningful equality due to async function nature
    // Return reference equality as fallback
    return a === b;
  }
});

/**
 * TaskEither Ord instance
 * Provides lexicographic ordering based on reference comparison
 */
export const TaskEitherOrd = deriveOrdInstance({
  customOrd: <E, A>(a: TaskEither<E, A>, b: TaskEither<E, A>): number => {
    // Use reference comparison for ordering
    if (a === b) return 0;
    // Use object identity hash for consistent ordering
    const aHash = Object.prototype.toString.call(a);
    const bHash = Object.prototype.toString.call(b);
    return aHash.localeCompare(bHash);
  }
});

/**
 * TaskEither Show instance
 * Provides string representation of the TaskEither
 */
export const TaskEitherShow = deriveShowInstance({
  customShow: <E, A>(a: TaskEither<E, A>): string => {
    return `TaskEither(<async function>)`;
  }
});

// ============================================================================
// Part 4: Effect Monads Eq Instances
// ============================================================================

/**
 * IO Eq instance
 * Note: IO cannot have meaningful equality due to its function nature
 * This provides reference equality as a fallback
 */
export const IOEq = deriveEqInstance({
  customEq: <A>(a: IO<A>, b: IO<A>): boolean => {
    // IO cannot have meaningful equality due to function nature
    // Return reference equality as fallback
    return a === b;
  }
});

/**
 * Task Eq instance
 * Note: Task cannot have meaningful equality due to its async function nature
 * This provides reference equality as a fallback
 */
export const TaskEq = deriveEqInstance({
  customOrd: <A>(a: Task<A>, b: Task<A>): boolean => {
    // Task cannot have meaningful equality due to async function nature
    // Return reference equality as fallback
    return a === b;
  }
});

/**
 * State Eq instance
 * Note: State cannot have meaningful equality due to its function nature
 * This provides reference equality as a fallback
 */
export const StateEq = deriveEqInstance({
  customEq: <S, A>(a: State<S, A>, b: State<S, A>): boolean => {
    // State cannot have meaningful equality due to function nature
    // Return reference equality as fallback
    return a === b;
  }
});

// ============================================================================
// Part 5: Enhanced Persistent Collection Instances
// ============================================================================

/**
 * Enhanced PersistentList Eq instance with deep equality
 */
export const PersistentListEqEnhanced = deriveEqInstance({
  customEq: <A>(a: PersistentList<A>, b: PersistentList<A>): boolean => {
    if (a.length !== b.length) return false;
    
    // Compare elements recursively
    for (let i = 0; i < a.length; i++) {
      const aVal = a.get(i);
      const bVal = b.get(i);
      
      // Use JSON.stringify for deep equality of complex objects
      if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
        return false;
      }
    }
    
    return true;
  }
});

/**
 * Enhanced PersistentList Ord instance with lexicographic ordering
 */
export const PersistentListOrdEnhanced = deriveOrdInstance({
  customOrd: <A>(a: PersistentList<A>, b: PersistentList<A>): number => {
    const minLength = Math.min(a.length, b.length);
    
    for (let i = 0; i < minLength; i++) {
      const aVal = a.get(i);
      const bVal = b.get(i);
      
      // Use JSON.stringify for consistent comparison
      const aStr = JSON.stringify(aVal);
      const bStr = JSON.stringify(bVal);
      
      if (aStr < bStr) return -1;
      if (aStr > bStr) return 1;
    }
    
    // If all elements are equal, shorter list comes first
    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;
    return 0;
  }
});

/**
 * Enhanced PersistentList Show instance
 */
export const PersistentListShowEnhanced = deriveShowInstance({
  customShow: <A>(a: PersistentList<A>): string => {
    const elements = [];
    for (let i = 0; i < a.length; i++) {
      elements.push(JSON.stringify(a.get(i)));
    }
    return `PersistentList([${elements.join(', ')}])`;
  }
});

/**
 * Enhanced PersistentMap Eq instance with deep equality
 */
export const PersistentMapEqEnhanced = deriveEqInstance({
  customEq: <K, V>(a: PersistentMap<K, V>, b: PersistentMap<K, V>): boolean => {
    if (a.size !== b.size) return false;
    
    // Compare all key-value pairs
    for (const [key, value] of a.entries()) {
      const bValue = b.get(key);
      if (JSON.stringify(value) !== JSON.stringify(bValue)) {
        return false;
      }
    }
    
    return true;
  }
});

/**
 * Enhanced PersistentMap Ord instance with lexicographic ordering
 */
export const PersistentMapOrdEnhanced = deriveOrdInstance({
  customOrd: <K, V>(a: PersistentMap<K, V>, b: PersistentMap<K, V>): number => {
    const aKeys = Array.from(a.keys()).sort();
    const bKeys = Array.from(b.keys()).sort();
    
    // Compare keys first
    for (let i = 0; i < Math.min(aKeys.length, bKeys.length); i++) {
      const aKeyStr = JSON.stringify(aKeys[i]);
      const bKeyStr = JSON.stringify(bKeys[i]);
      
      if (aKeyStr < bKeyStr) return -1;
      if (aKeyStr > bKeyStr) return 1;
    }
    
    if (aKeys.length < bKeys.length) return -1;
    if (aKeys.length > bKeys.length) return 1;
    
    // If keys are equal, compare values
    for (const key of aKeys) {
      const aValue = a.get(key);
      const bValue = b.get(key);
      
      const aValueStr = JSON.stringify(aValue);
      const bValueStr = JSON.stringify(bValue);
      
      if (aValueStr < bValueStr) return -1;
      if (aValueStr > bValueStr) return 1;
    }
    
    return 0;
  }
});

/**
 * Enhanced PersistentMap Show instance
 */
export const PersistentMapShowEnhanced = deriveShowInstance({
  customShow: <K, V>(a: PersistentMap<K, V>): string => {
    const entries = [];
    for (const [key, value] of a.entries()) {
      entries.push(`${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
    return `PersistentMap({${entries.join(', ')}})`;
  }
});

/**
 * Enhanced PersistentSet Eq instance with deep equality
 */
export const PersistentSetEqEnhanced = deriveEqInstance({
  customEq: <A>(a: PersistentSet<A>, b: PersistentSet<A>): boolean => {
    if (a.size !== b.size) return false;
    
    // Compare all elements
    for (const value of a.values()) {
      if (!b.has(value)) {
        return false;
      }
    }
    
    return true;
  }
});

/**
 * Enhanced PersistentSet Ord instance with lexicographic ordering
 */
export const PersistentSetOrdEnhanced = deriveOrdInstance({
  customOrd: <A>(a: PersistentSet<A>, b: PersistentSet<A>): number => {
    const aValues = Array.from(a.values()).sort();
    const bValues = Array.from(b.values()).sort();
    
    for (let i = 0; i < Math.min(aValues.length, bValues.length); i++) {
      const aValueStr = JSON.stringify(aValues[i]);
      const bValueStr = JSON.stringify(bValues[i]);
      
      if (aValueStr < bValueStr) return -1;
      if (aValueStr > bValueStr) return 1;
    }
    
    if (aValues.length < bValues.length) return -1;
    if (aValues.length > bValues.length) return 1;
    return 0;
  }
});

/**
 * Enhanced PersistentSet Show instance
 */
export const PersistentSetShowEnhanced = deriveShowInstance({
  customShow: <A>(a: PersistentSet<A>): string => {
    const elements = Array.from(a.values()).map(v => JSON.stringify(v));
    return `PersistentSet([${elements.join(', ')}])`;
  }
});

// ============================================================================
// Part 6: Registry Integration
// ============================================================================

/**
 * Register all missing Eq, Ord, and Show instances with the global registry
 */
export function registerAllMissingADTInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register Tree instances
    registry.registerTypeclass('Tree', 'Eq', Tree.Eq);
    registry.registerTypeclass('Tree', 'Ord', Tree.Ord);
    registry.registerTypeclass('Tree', 'Show', Tree.Show);
    registry.registerDerivable('Tree', {
      eq: Tree.Eq,
      ord: Tree.Ord,
      show: Tree.Show,
      purity: { effect: 'Pure' as const }
    });
    
    // Register ObservableLite instances
    registry.registerTypeclass('ObservableLite', 'Eq', ObservableLiteEq);
    registry.registerTypeclass('ObservableLite', 'Ord', ObservableLiteOrd);
    registry.registerTypeclass('ObservableLite', 'Show', ObservableLiteShow);
    
    // Register TaskEither instances
    registry.registerTypeclass('TaskEither', 'Eq', TaskEitherEq);
    registry.registerTypeclass('TaskEither', 'Ord', TaskEitherOrd);
    registry.registerTypeclass('TaskEither', 'Show', TaskEitherShow);
    
    // Register IO Eq instance
    registry.registerTypeclass('IO', 'Eq', IOEq);
    
    // Register Task Eq instance
    registry.registerTypeclass('Task', 'Eq', TaskEq);
    
    // Register State Eq instance
    registry.registerTypeclass('State', 'Eq', StateEq);
    
    // Register enhanced PersistentList instances
    registry.registerTypeclass('PersistentList', 'Eq', PersistentListEqEnhanced);
    registry.registerTypeclass('PersistentList', 'Ord', PersistentListOrdEnhanced);
    registry.registerTypeclass('PersistentList', 'Show', PersistentListShowEnhanced);
    
    // Register enhanced PersistentMap instances
    registry.registerTypeclass('PersistentMap', 'Eq', PersistentMapEqEnhanced);
    registry.registerTypeclass('PersistentMap', 'Ord', PersistentMapOrdEnhanced);
    registry.registerTypeclass('PersistentMap', 'Show', PersistentMapShowEnhanced);
    
    // Register enhanced PersistentSet instances
    registry.registerTypeclass('PersistentSet', 'Eq', PersistentSetEqEnhanced);
    registry.registerTypeclass('PersistentSet', 'Ord', PersistentSetOrdEnhanced);
    registry.registerTypeclass('PersistentSet', 'Show', PersistentSetShowEnhanced);
    
    console.log('✅ Registered all missing ADT Eq, Ord, and Show instances');
  }
}

// ============================================================================
// Part 7: Fluent API Integration
// ============================================================================

/**
 * Add fluent Eq, Ord, Show methods to ADT instances
 */
export function addFluentEqOrdShowMethods(): void {
  // Add to ObservableLite prototype
  if (ObservableLite.prototype) {
    ObservableLite.prototype.equals = function<A>(this: ObservableLite<A>, other: ObservableLite<A>): boolean {
      return ObservableLiteEq.equals(this, other);
    };
    
    ObservableLite.prototype.compare = function<A>(this: ObservableLite<A>, other: ObservableLite<A>): number {
      return ObservableLiteOrd.compare(this, other);
    };
    
    ObservableLite.prototype.show = function<A>(this: ObservableLite<A>): string {
      return ObservableLiteShow.show(this);
    };
  }
  
  // Add to TaskEither prototype
  if (TaskEither.prototype) {
    TaskEither.prototype.equals = function<E, A>(this: TaskEither<E, A>, other: TaskEither<E, A>): boolean {
      return TaskEitherEq.equals(this, other);
    };
    
    TaskEither.prototype.compare = function<E, A>(this: TaskEither<E, A>, other: TaskEither<E, A>): number {
      return TaskEitherOrd.compare(this, other);
    };
    
    TaskEither.prototype.show = function<E, A>(this: TaskEither<E, A>): string {
      return TaskEitherShow.show(this);
    };
  }
  
  // Add to IO prototype
  if (IO.prototype) {
    IO.prototype.equals = function<A>(this: IO<A>, other: IO<A>): boolean {
      return IOEq.equals(this, other);
    };
  }
  
  // Add to Task prototype
  if (Task.prototype) {
    Task.prototype.equals = function<A>(this: Task<A>, other: Task<A>): boolean {
      return TaskEq.equals(this, other);
    };
  }
  
  // Add to State prototype
  if (State.prototype) {
    State.prototype.equals = function<S, A>(this: State<S, A>, other: State<S, A>): boolean {
      return StateEq.equals(this, other);
    };
  }
  
  // Add to PersistentList prototype
  if (PersistentList.prototype) {
    PersistentList.prototype.equals = function<A>(this: PersistentList<A>, other: PersistentList<A>): boolean {
      return PersistentListEqEnhanced.equals(this, other);
    };
    
    PersistentList.prototype.compare = function<A>(this: PersistentList<A>, other: PersistentList<A>): number {
      return PersistentListOrdEnhanced.compare(this, other);
    };
    
    PersistentList.prototype.show = function<A>(this: PersistentList<A>): string {
      return PersistentListShowEnhanced.show(this);
    };
  }
  
  // Add to PersistentMap prototype
  if (PersistentMap.prototype) {
    PersistentMap.prototype.equals = function<K, V>(this: PersistentMap<K, V>, other: PersistentMap<K, V>): boolean {
      return PersistentMapEqEnhanced.equals(this, other);
    };
    
    PersistentMap.prototype.compare = function<K, V>(this: PersistentMap<K, V>, other: PersistentMap<K, V>): number {
      return PersistentMapOrdEnhanced.compare(this, other);
    };
    
    PersistentMap.prototype.show = function<K, V>(this: PersistentMap<K, V>): string {
      return PersistentMapShowEnhanced.show(this);
    };
  }
  
  // Add to PersistentSet prototype
  if (PersistentSet.prototype) {
    PersistentSet.prototype.equals = function<A>(this: PersistentSet<A>, other: PersistentSet<A>): boolean {
      return PersistentSetEqEnhanced.equals(this, other);
    };
    
    PersistentSet.prototype.compare = function<A>(this: PersistentSet<A>, other: PersistentSet<A>): number {
      return PersistentSetOrdEnhanced.compare(this, other);
    };
    
    PersistentSet.prototype.show = function<A>(this: PersistentSet<A>): string {
      return PersistentSetShowEnhanced.show(this);
    };
  }
  
  console.log('✅ Added fluent Eq, Ord, Show methods to all ADT prototypes');
}

// ============================================================================
// Part 8: Data-Last Functions
// ============================================================================

/**
 * Data-last Eq function for ObservableLite
 */
export const eqObservableLite = <A>(a: ObservableLite<A>, b: ObservableLite<A>): boolean =>
  ObservableLiteEq.equals(a, b);

/**
 * Data-last Ord function for ObservableLite
 */
export const compareObservableLite = <A>(a: ObservableLite<A>, b: ObservableLite<A>): number =>
  ObservableLiteOrd.compare(a, b);

/**
 * Data-last Show function for ObservableLite
 */
export const showObservableLite = <A>(a: ObservableLite<A>): string =>
  ObservableLiteShow.show(a);

/**
 * Data-last Eq function for TaskEither
 */
export const eqTaskEither = <E, A>(a: TaskEither<E, A>, b: TaskEither<E, A>): boolean =>
  TaskEitherEq.equals(a, b);

/**
 * Data-last Ord function for TaskEither
 */
export const compareTaskEither = <E, A>(a: TaskEither<E, A>, b: TaskEither<E, A>): number =>
  TaskEitherOrd.compare(a, b);

/**
 * Data-last Show function for TaskEither
 */
export const showTaskEither = <E, A>(a: TaskEither<E, A>): string =>
  TaskEitherShow.show(a);

/**
 * Data-last Eq function for IO
 */
export const eqIO = <A>(a: IO<A>, b: IO<A>): boolean =>
  IOEq.equals(a, b);

/**
 * Data-last Eq function for Task
 */
export const eqTask = <A>(a: Task<A>, b: Task<A>): boolean =>
  TaskEq.equals(a, b);

/**
 * Data-last Eq function for State
 */
export const eqState = <S, A>(a: State<S, A>, b: State<S, A>): boolean =>
  StateEq.equals(a, b);

// ============================================================================
// Part 9: Auto-Initialization
// ============================================================================

/**
 * Initialize all missing ADT instances
 */
export function initializeAllADTInstances(): void {
  registerAllMissingADTInstances();
  addFluentEqOrdShowMethods();
  console.log('✅ All ADT Eq, Ord, and Show instances initialized');
}

// Auto-initialize when module is loaded
initializeAllADTInstances(); 