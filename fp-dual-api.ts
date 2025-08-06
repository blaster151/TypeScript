/**
 * Dual API System for TypeScript FP
 * 
 * This module provides both fluent instance methods and data-last standalone functions
 * for all typeclass operations, ensuring maximum ergonomics for different coding styles.
 */

import type { 
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor, 
  Profunctor,
  Kind, 
  Apply, 
  Type 
} from './fp-typeclasses';

// ============================================================================
// Core Typeclass Operations
// ============================================================================

/**
 * Typeclass operation names for automatic dual API generation
 */
export const TYPECLASS_OPERATIONS = {
  // Functor operations
  Functor: ['map'] as const,
  
  // Applicative operations (extends Functor)
  Applicative: ['of', 'ap'] as const,
  
  // Monad operations (extends Applicative)
  Monad: ['chain'] as const,
  
  // Bifunctor operations
  Bifunctor: ['bimap', 'mapLeft'] as const,
  
  // Profunctor operations
  Profunctor: ['dimap', 'lmap', 'rmap'] as const,
  
  // Additional operations from ObservableLite
  ObservableLite: ['filter', 'scan', 'take', 'skip', 'startWith', 'concat', 'merge'] as const,
  
  // Optics operations
  Optics: ['over', 'preview', 'mapWithOptic'] as const,
  
  // ADT operations
  ADT: ['match', 'mapMatch', 'bichain', 'matchTag', 'filterTag', 'extractValues', 'extractErrors'] as const
} as const;

// ============================================================================
// Data-Last Standalone Functions
// ============================================================================

/**
 * Functor operations - data-last standalone functions
 */
export const map = <F extends Kind<[Type, Type]>, A, B>(F_: Functor<F>) =>
  (f: (a: A) => B) => (fa: Apply<F, [A]>) => F_.map(fa, f);

/**
 * Applicative operations - data-last standalone functions
 */
export const of = <F extends Kind<[Type, Type]>, A>(F_: Applicative<F>) =>
  (a: A) => F_.of(a);

export const ap = <F extends Kind<[Type, Type]>, A, B>(F_: Applicative<F>) =>
  (fab: Apply<F, [(a: A) => B]>) => (fa: Apply<F, [A]>) => F_.ap(fab, fa);

/**
 * Monad operations - data-last standalone functions
 */
export const chain = <F extends Kind<[Type, Type]>, A, B>(F_: Monad<F>) =>
  (f: (a: A) => Apply<F, [B]>) => (fa: Apply<F, [A]>) => F_.chain(fa, f);

/**
 * Bifunctor operations - data-last standalone functions
 */
export const bimap = <F extends Kind<[Type, Type, Type]>, A, B, C, D>(F_: Bifunctor<F>) =>
  (f: (a: A) => C) => (g: (b: B) => D) => (fab: Apply<F, [A, B]>) => F_.bimap(fab, f, g);

export const mapLeft = <F extends Kind<[Type, Type, Type]>, A, B, C>(F_: Bifunctor<F>) =>
  (f: (a: A) => C) => (fab: Apply<F, [A, B]>) => F_.mapLeft?.(fab, f) ?? F_.bimap(fab, f, (b: B) => b);

/**
 * Profunctor operations - data-last standalone functions
 */
export const dimap = <F extends Kind<[Type, Type, Type]>, A, B, C, D>(F_: Profunctor<F>) =>
  (f: (c: C) => A) => (g: (b: B) => D) => (p: Apply<F, [A, B]>) => F_.dimap(p, f, g);

export const lmap = <F extends Kind<[Type, Type, Type]>, A, B, C>(F_: Profunctor<F>) =>
  (f: (c: C) => A) => (p: Apply<F, [A, B]>) => F_.lmap?.(p, f) ?? F_.dimap(p, f, (b: B) => b);

export const rmap = <F extends Kind<[Type, Type, Type]>, A, B, D>(F_: Profunctor<F>) =>
  (g: (b: B) => D) => (p: Apply<F, [A, B]>) => F_.rmap?.(p, g) ?? F_.dimap(p, (a: A) => a, g);

// ============================================================================
// Dual API Generator
// ============================================================================

/**
 * Configuration for dual API generation
 */
export interface DualAPIConfig<F extends Kind<any[]>> {
  /** The typeclass instance */
  instance: any;
  /** The type constructor name */
  name: string;
  /** Operations to generate dual APIs for */
  operations: readonly string[];
  /** Custom operation implementations */
  customOperations?: Record<string, (instance: any) => any>;
}

/**
 * Generates both fluent instance methods and data-last standalone functions
 */
export function createDualAPI<F extends Kind<any[]>>(config: DualAPIConfig<F>) {
  const { instance, name, operations, customOperations = {} } = config;
  
  const standaloneFunctions: Record<string, any> = {};
  
  // Generate data-last standalone functions
  operations.forEach(op => {
    if (customOperations[op]) {
      standaloneFunctions[op] = customOperations[op](instance);
    } else {
      // Generate standard curried function
      standaloneFunctions[op] = (...args: any[]) => {
        return (fa: any) => {
          if (typeof instance[op] === 'function') {
            return instance[op](fa, ...args);
          }
          throw new Error(`Operation ${op} not found on ${name} instance`);
        };
      };
    }
  });
  
  return {
    // The original instance
    instance,
    
    // Data-last standalone functions
    ...standaloneFunctions,
    
    // Helper to add fluent methods to a prototype
    addFluentMethods: (prototype: any) => {
      operations.forEach(op => {
        if (prototype[op]) {
          // Method already exists, skip
          return;
        }
        
        if (customOperations[op]) {
          // Use custom implementation
          prototype[op] = customOperations[op](instance);
        } else {
          // Generate standard fluent method
          prototype[op] = function(...args: any[]) {
            if (typeof instance[op] === 'function') {
              return instance[op](this, ...args);
            }
            throw new Error(`Operation ${op} not found on ${name} instance`);
          };
        }
      });
    }
  };
}

// ============================================================================
// Pre-built Dual APIs for Common Types
// ============================================================================

/**
 * Array dual API
 */
export const ArrayAPI = createDualAPI({
  name: 'Array',
  instance: {
    map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f),
    of: <A>(a: A): A[] => [a],
    ap: <A, B>(fab: ((a: A) => B)[], fa: A[]): B[] => 
      fab.flatMap(f => fa.map(f)),
    chain: <A, B>(fa: A[], f: (a: A) => B[]): B[] => 
      fa.flatMap(f)
  },
  operations: ['map', 'of', 'ap', 'chain']
});

/**
 * Maybe dual API
 */
export const MaybeAPI = createDualAPI({
  name: 'Maybe',
  instance: {
    map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
      fa.tag === 'Just' ? { tag: 'Just', value: f(fa.value) } : { tag: 'Nothing' },
    of: <A>(a: A): Maybe<A> => ({ tag: 'Just', value: a }),
    ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => 
      fab.tag === 'Just' && fa.tag === 'Just' 
        ? { tag: 'Just', value: fab.value(fa.value) }
        : { tag: 'Nothing' },
    chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
      fa.tag === 'Just' ? f(fa.value) : { tag: 'Nothing' }
  },
  operations: ['map', 'of', 'ap', 'chain']
});

/**
 * Either dual API
 */
export const EitherAPI = createDualAPI({
  name: 'Either',
  instance: {
    map: <L, A, B>(fa: Either<L, A>, f: (a: A) => B): Either<L, B> => 
      fa.tag === 'Right' ? { tag: 'Right', value: f(fa.value) } : fa,
    bimap: <L, R, L2, R2>(fa: Either<L, R>, f: (l: L) => L2, g: (r: R) => R2): Either<L2, R2> => 
      fa.tag === 'Right' ? { tag: 'Right', value: g(fa.value) } : { tag: 'Left', value: f(fa.value) },
    mapLeft: <L, R, L2>(fa: Either<L, R>, f: (l: L) => L2): Either<L2, R> => 
      fa.tag === 'Left' ? { tag: 'Left', value: f(fa.value) } : fa
  },
  operations: ['map', 'bimap', 'mapLeft']
});

/**
 * ObservableLite dual API
 */
export const ObservableLiteAPI = createDualAPI({
  name: 'ObservableLite',
  instance: {
    map: <A, B>(fa: ObservableLite<A>, f: (a: A) => B): ObservableLite<B> => fa.map(f),
    of: <A>(a: A): ObservableLite<A> => ObservableLite.of(a),
    ap: <A, B>(fab: ObservableLite<(a: A) => B>, fa: ObservableLite<A>): ObservableLite<B> => 
      fab.ap(fa),
    chain: <A, B>(fa: ObservableLite<A>, f: (a: A) => ObservableLite<B>): ObservableLite<B> => 
      fa.chain(f),
    filter: <A>(fa: ObservableLite<A>, predicate: (a: A) => boolean): ObservableLite<A> => 
      fa.filter(predicate),
    dimap: <A, B, C, D>(fa: ObservableLite<A>, f: (c: C) => A, g: (a: A) => D): ObservableLite<D> => 
      fa.dimap(f, g),
    lmap: <A, B, C>(fa: ObservableLite<A>, f: (c: C) => A): ObservableLite<A> => 
      fa.lmap(f),
    rmap: <A, B, D>(fa: ObservableLite<A>, g: (a: A) => D): ObservableLite<D> => 
      fa.rmap(g)
  },
  operations: ['map', 'of', 'ap', 'chain', 'filter', 'dimap', 'lmap', 'rmap']
});

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Maybe type definition
 */
export type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };

/**
 * Either type definition
 */
export type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };

/**
 * ObservableLite type definition (simplified for this module)
 */
export interface ObservableLite<A> {
  map<B>(f: (a: A) => B): ObservableLite<B>;
  chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>;
  filter(predicate: (a: A) => boolean): ObservableLite<A>;
  dimap<C, D>(f: (c: C) => A, g: (a: A) => D): ObservableLite<D>;
  lmap<C>(f: (c: C) => A): ObservableLite<A>;
  rmap<D>(g: (a: A) => D): ObservableLite<D>;
  ap<B>(other: ObservableLite<(a: A) => B>): ObservableLite<B>;
  static of<A>(a: A): ObservableLite<A>;
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example usage of dual APIs
 */
export const dualAPIExamples = {
  // Fluent style
  fluent: {
    array: [1, 2, 3].map(x => x * 2),
    maybe: MaybeAPI.instance.of(5).map(x => x * 2),
    either: EitherAPI.instance.of(5).map(x => x * 2),
    observable: ObservableLiteAPI.instance.of(5).map(x => x * 2)
  },
  
  // Pipe-friendly style
  pipe: {
    array: `pipe([1, 2, 3], ArrayAPI.map(x => x * 2))`,
    maybe: `pipe(MaybeAPI.of(5), MaybeAPI.map(x => x * 2))`,
    either: `pipe(EitherAPI.of(5), EitherAPI.map(x => x * 2))`,
    observable: `pipe(ObservableLiteAPI.of(5), ObservableLiteAPI.map(x => x * 2))`
  }
};

// ============================================================================
// Auto-registration with Global Registry
// ============================================================================

/**
 * Register dual APIs with the global registry
 */
export function registerDualAPIs(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register dual APIs
    registry.registerDualAPI('Array', ArrayAPI);
    registry.registerDualAPI('Maybe', MaybeAPI);
    registry.registerDualAPI('Either', EitherAPI);
    registry.registerDualAPI('ObservableLite', ObservableLiteAPI);
  }
}

// Auto-register on module load
registerDualAPIs(); 