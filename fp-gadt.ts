/**
 * Generalized Algebraic Data Types (GADTs) with Pattern Matching
 * 
 * This module provides a complete GADT system with type-safe pattern matching,
 * integrating with the existing HKT system for functional programming patterns.
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

// ============================================================================
// Typeclass Instances (Derived)
// ============================================================================

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';

/**
 * MaybeGADT derived instances
 */
export const MaybeGADTInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: MaybeGADT<A>, f: (a: A) => B): MaybeGADT<B> => 
    matchMaybe(fa, {
      Just: (value) => MaybeGADT.Just(f(value)),
      Nothing: () => MaybeGADT.Nothing()
    }),
  customChain: <A, B>(fa: MaybeGADT<A>, f: (a: A) => MaybeGADT<B>): MaybeGADT<B> => 
    matchMaybe(fa, {
      Just: (value) => f(value),
      Nothing: () => MaybeGADT.Nothing()
    })
});

export const MaybeGADTFunctor = MaybeGADTInstances.functor;
export const MaybeGADTApplicative = MaybeGADTInstances.applicative;
export const MaybeGADTMonad = MaybeGADTInstances.monad;

/**
 * MaybeGADT standard typeclass instances
 */
export const MaybeGADTEq = deriveEqInstance({
  customEq: <A>(a: MaybeGADT<A>, b: MaybeGADT<A>): boolean => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => aValue === bValue,
        Nothing: () => false
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => false,
        Nothing: () => true
      })
    });
  }
});

export const MaybeGADTOrd = deriveOrdInstance({
  customOrd: <A>(a: MaybeGADT<A>, b: MaybeGADT<A>): number => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        },
        Nothing: () => 1 // Just > Nothing
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => -1, // Nothing < Just
        Nothing: () => 0
      })
    });
  }
});

export const MaybeGADTShow = deriveShowInstance({
  customShow: <A>(a: MaybeGADT<A>): string => 
    matchMaybe(a, {
      Just: value => `Just(${JSON.stringify(value)})`,
      Nothing: () => 'Nothing'
    })
});

/**
 * EitherGADT derived instances
 */
export const EitherGADTInstances = deriveInstances({
  bifunctor: true,
  customBimap: <A, B, C, D>(
    fab: EitherGADT<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
  ): EitherGADT<C, D> => 
    matchEither(fab, {
      Left: (value) => EitherGADT.Left(f(value)),
      Right: (value) => EitherGADT.Right(g(value))
    })
});

export const EitherGADTBifunctor = EitherGADTInstances.bifunctor;

/**
 * EitherGADT standard typeclass instances
 */
export const EitherGADTEq = deriveEqInstance({
  customEq: <A, B>(a: EitherGADT<A, B>, b: EitherGADT<A, B>): boolean => {
    return matchEither(a, {
      Left: aValue => matchEither(b, {
        Left: bValue => aValue === bValue,
        Right: () => false
      }),
      Right: aValue => matchEither(b, {
        Left: () => false,
        Right: bValue => aValue === bValue
      })
    });
  }
});

export const EitherGADTOrd = deriveOrdInstance({
  customOrd: <A, B>(a: EitherGADT<A, B>, b: EitherGADT<A, B>): number => {
    return matchEither(a, {
      Left: aValue => matchEither(b, {
        Left: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        },
        Right: () => -1 // Left < Right
      }),
      Right: aValue => matchEither(b, {
        Left: () => 1, // Right > Left
        Right: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        }
      })
    });
  }
});

export const EitherGADTShow = deriveShowInstance({
  customShow: <A, B>(a: EitherGADT<A, B>): string => 
    matchEither(a, {
      Left: value => `Left(${JSON.stringify(value)})`,
      Right: value => `Right(${JSON.stringify(value)})`
    })
});

/**
 * Derived instances for ListGADTK
 */
export const ListGADTInstances = deriveInstances<ListGADTK>({
  map: <A, B>(fa: ListGADT<A>, f: (a: A) => B): ListGADT<B> => 
    matchList(fa, {
      Nil: () => ListGADT.Nil(),
      Cons: (head, tail) => ListGADT.Cons(f(head), ListGADTInstances.map(tail, f))
    })
});
attachPurityMarker(ListGADTInstances, 'Pure');

export const ListGADTFunctor = ListGADTInstances.functor;

/**
 * ListGADT standard typeclass instances
 */
export const ListGADTEq = deriveEqInstance({
  customEq: <A>(a: ListGADT<A>, b: ListGADT<A>): boolean => {
    return matchList(a, {
      Nil: () => matchList(b, {
        Nil: () => true,
        Cons: () => false
      }),
      Cons: (aHead, aTail) => matchList(b, {
        Nil: () => false,
        Cons: (bHead, bTail) => aHead === bHead && ListGADTEq.equals(aTail, bTail)
      })
    });
  }
});

export const ListGADTOrd = deriveOrdInstance({
  customOrd: <A>(a: ListGADT<A>, b: ListGADT<A>): number => {
    return matchList(a, {
      Nil: () => matchList(b, {
        Nil: () => 0,
        Cons: () => -1 // Nil < Cons
      }),
      Cons: (aHead, aTail) => matchList(b, {
        Nil: () => 1, // Cons > Nil
        Cons: (bHead, bTail) => {
          if (aHead < bHead) return -1;
          if (aHead > bHead) return 1;
          return ListGADTOrd.compare(aTail, bTail);
        }
      })
    });
  }
});

export const ListGADTShow = deriveShowInstance({
  customShow: <A>(a: ListGADT<A>): string => 
    matchList(a, {
      Nil: () => '[]',
      Cons: (head, tail) => `[${JSON.stringify(head)}, ...${ListGADTShow.show(tail)}]`
    })
});

// ============================================================================
// Core GADT Types and Utilities
// ============================================================================

/**
 * Base GADT type that binds a tag to the type of its payload
 * Each constructor can have precise type information that can be refined during pattern matching
 */
export type GADT<Tag extends string, Payload> = {
  readonly tag: Tag;
  readonly payload: Payload;
};

/**
 * Type-safe pattern matcher for GADTs
 * The matcher narrows the type parameter based on the tag and enforces exhaustiveness
 */
export type PatternMatcher<A, Cases extends Record<string, (...args: any[]) => any>> = {
  [K in keyof Cases]: Cases[K];
} & {
  readonly __exhaustive?: never;
};

/**
 * Pattern matcher that allows partial matching (not all cases required)
 */
export type PartialPatternMatcher<A, Cases extends Record<string, (...args: any[]) => any>> = {
  [K in keyof Cases]?: Cases[K];
} & {
  readonly __partial?: never;
};

/**
 * Type-safe match function for GADTs
 * Enforces exhaustiveness and provides type narrowing
 */
export function match<Tag extends string, Payload, Cases extends Record<string, (...args: any[]) => any>>(
  gadt: GADT<Tag, Payload>,
  cases: Cases
): ReturnType<Cases[keyof Cases]> {
  const handler = cases[gadt.tag as keyof Cases];
  if (!handler) {
    throw new Error(`Unhandled case: ${gadt.tag}`);
  }
  return handler(gadt.payload);
}

/**
 * Type-safe partial match function for GADTs
 * Allows partial matching with optional cases
 */
export function matchPartial<A, Tag extends string, Payload, Cases extends Record<string, (...args: any[]) => any>>(
  gadt: GADT<Tag, Payload>,
  cases: PartialPatternMatcher<A, Cases>
): ReturnType<Cases[keyof Cases]> | undefined {
  const handler = cases[gadt.tag as keyof Cases];
  if (!handler) {
    return undefined;
  }
  return handler(gadt.payload);
}

// ============================================================================
// Example GADTs
// ============================================================================

/**
 * Typed Expression AST GADT
 * Demonstrates precise type information that can be refined during pattern matching
 */
export type Expr<A> =
  | GADT<'Const', { value: A }>
  | GADT<'Add', { left: Expr<number>; right: Expr<number> }>
  | GADT<'If', { cond: Expr<boolean>; then: Expr<A>; else: Expr<A> }>
  | GADT<'Var', { name: string }>
  | GADT<'Let', { name: string; value: Expr<A>; body: Expr<A> }>;

/**
 * Expr as HKT for integration with typeclass system
 */
export interface ExprK extends Kind1 {
  readonly type: Expr<this['arg0']>;
}

/**
 * Constructor functions for Expr GADT
 */
export const Expr = {
  Const: <A>(value: A): Expr<A> => ({ tag: 'Const', payload: { value } }),
  Add: (left: Expr<number>, right: Expr<number>): Expr<number> => 
    ({ tag: 'Add', payload: { left, right } }),
  If: <A>(cond: Expr<boolean>, then: Expr<A>, else_: Expr<A>): Expr<A> => 
    ({ tag: 'If', payload: { cond, then, else: else_ } }),
  Var: (name: string): Expr<any> => ({ tag: 'Var', payload: { name } }),
  Let: <A>(name: string, value: Expr<A>, body: Expr<A>): Expr<A> => 
    ({ tag: 'Let', payload: { name, value, body } })
};

/**
 * Type-safe evaluator for Expr<number>
 */
export function evaluate(expr: Expr<number>): number {
  switch (expr.tag) {
    case 'Const':
      return expr.payload.value;
    case 'Add':
      return evaluate(expr.payload.left) + evaluate(expr.payload.right);
    case 'If':
      return evaluate(expr.payload.cond) ? evaluate(expr.payload.then) : evaluate(expr.payload.else);
    case 'Var':
      throw new Error(`Unbound variable: ${expr.payload.name}`);
    case 'Let':
      const value = evaluate(expr.payload.value);
      // In a real implementation, we'd update the environment
      return evaluate(expr.payload.body);
  }
}

/**
 * Type-safe transformer for Expr<string>
 */
export function transformString(expr: Expr<string>): Expr<string> {
  switch (expr.tag) {
    case 'Const':
      return Expr.Const(expr.payload.value.toUpperCase());
    case 'Add':
      throw new Error("Cannot add strings in this context");
    case 'If':
      return Expr.If(expr.payload.cond, transformString(expr.payload.then), transformString(expr.payload.else));
    case 'Var':
      return Expr.Var(expr.payload.name);
    case 'Let':
      return Expr.Let(expr.payload.name, transformString(expr.payload.value), transformString(expr.payload.body));
  }
}

// ============================================================================
// Maybe as GADT (not just union type)
// ============================================================================

/**
 * Maybe implemented as a GADT for precise type information
 */
export type MaybeGADT<A> =
  | GADT<'Just', { value: A }>
  | GADT<'Nothing', {}>;

/**
 * MaybeGADT as HKT for integration with typeclass system
 */
export interface MaybeGADTK extends Kind1 {
  readonly type: MaybeGADT<this['arg0']>;
}

/**
 * Constructor functions for MaybeGADT
 */
export const MaybeGADT = {
  Just: <A>(value: A): MaybeGADT<A> => ({ tag: 'Just', payload: { value } }),
  Nothing: <A>(): MaybeGADT<A> => ({ tag: 'Nothing', payload: {} })
};

/**
 * Type-safe pattern matcher for MaybeGADT
 */
export function matchMaybe<A, B>(
  maybe: MaybeGADT<A>,
  cases: {
    Just: (value: A) => B;
    Nothing: () => B;
  }
): B {
  switch (maybe.tag) {
    case 'Just':
      return cases.Just(maybe.payload.value);
    case 'Nothing':
      return cases.Nothing();
  }
}

// ============================================================================
// Either as GADT
// ============================================================================

/**
 * Either implemented as a GADT for precise type information
 */
export type EitherGADT<L, R> =
  | GADT<'Left', { value: L }>
  | GADT<'Right', { value: R }>;

/**
 * EitherGADT as HKT for integration with typeclass system
 */
export interface EitherGADTK extends Kind2 {
  readonly type: EitherGADT<this['arg0'], this['arg1']>;
}

/**
 * Constructor functions for EitherGADT
 */
export const EitherGADT = {
  Left: <L, R>(value: L): EitherGADT<L, R> => ({ tag: 'Left', payload: { value } }),
  Right: <L, R>(value: R): EitherGADT<L, R> => ({ tag: 'Right', payload: { value } })
};

/**
 * Type-safe pattern matcher for EitherGADT
 */
export function matchEither<L, R, B>(
  either: EitherGADT<L, R>,
  cases: {
    Left: (value: L) => B;
    Right: (value: R) => B;
  }
): B {
  return match(either, cases);
}

/**
 * Bifunctor instance for EitherGADT
 */
export const EitherGADTBifunctor: Bifunctor<EitherGADTK> = {
  bimap: <A, B, C, D>(
    fab: EitherGADT<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
  ): EitherGADT<C, D> => 
    matchEither(fab, {
      Left: (value) => EitherGADT.Left(f(value)),
      Right: (value) => EitherGADT.Right(g(value))
    }),
  
  mapLeft: <A, B, C>(fab: EitherGADT<A, B>, f: (a: A) => C): EitherGADT<C, B> => 
    matchEither(fab, {
      Left: (value) => EitherGADT.Left(f(value)),
      Right: (value) => EitherGADT.Right(value)
    }),
  
  mapRight: <A, B, D>(fab: EitherGADT<A, B>, g: (b: B) => D): EitherGADT<A, D> => 
    matchEither(fab, {
      Left: (value) => EitherGADT.Left(value),
      Right: (value) => EitherGADT.Right(g(value))
    })
};

// ============================================================================
// Advanced GADT Examples
// ============================================================================

/**
 * List implemented as a GADT
 */
export type ListGADT<A> =
  | GADT<'Nil', {}>
  | GADT<'Cons', { head: A; tail: ListGADT<A> }>;

/**
 * ListGADT as HKT
 */
export interface ListGADTK extends Kind1 {
  readonly type: ListGADT<this['arg0']>;
}

/**
 * Constructor functions for ListGADT
 */
export const ListGADT = {
  Nil: <A>(): ListGADT<A> => ({ tag: 'Nil', payload: {} }),
  Cons: <A>(head: A, tail: ListGADT<A>): ListGADT<A> => ({ tag: 'Cons', payload: { head, tail } })
};

/**
 * Type-safe pattern matcher for ListGADT
 */
export function matchList<A, B>(
  list: ListGADT<A>,
  cases: {
    Nil: () => B;
    Cons: (head: A, tail: ListGADT<A>) => B;
  }
): B {
  return match(list, cases);
}

/**
 * Functor instance for ListGADT
 */
export const ListGADTFunctor: Functor<ListGADTK> = {
  map: <A, B>(fa: ListGADT<A>, f: (a: A) => B): ListGADT<B> => 
    matchList(fa, {
      Nil: () => ListGADT.Nil(),
      Cons: (head, tail) => ListGADT.Cons(f(head), ListGADTFunctor.map(tail, f))
    })
};

// ============================================================================
// Typed Folds (Catamorphisms) - Extra Credit
// ============================================================================

/**
 * Type-safe fold (catamorphism) for GADTs
 * Provides a way to fold over GADT structures with type safety
 */
export type FoldAlgebra<A, R> = {
  [K in string]: (...args: any[]) => R;
};

/**
 * Fold function for GADTs
 */
export function fold<A, Tag extends string, Payload, R>(
  gadt: GADT<Tag, Payload>,
  algebra: FoldAlgebra<A, R>
): R {
  const handler = algebra[gadt.tag as keyof FoldAlgebra<A, R>];
  if (!handler) {
    throw new Error(`No handler for case: ${gadt.tag}`);
  }
  return handler(gadt.payload);
}

/**
 * Example: Fold for Expr to evaluate to number
 */
export function foldExprToNumber(expr: Expr<number>): number {
  return fold(expr, {
    Const: (payload) => payload.value,
    Add: (payload) => foldExprToNumber(payload.left) + foldExprToNumber(payload.right),
    If: (payload) => foldExprToNumber(payload.cond) ? foldExprToNumber(payload.then) : foldExprToNumber(payload.else),
    Var: (payload) => { throw new Error(`Unbound variable: ${payload.name}`); },
    Let: (payload) => {
      const value = foldExprToNumber(payload.value);
      return foldExprToNumber(payload.body);
    }
  });
}

/**
 * Example: Fold for List to sum numbers
 */
export function foldListSum(list: ListGADT<number>): number {
  return fold(list, {
    Nil: () => 0,
    Cons: (payload) => payload.head + foldListSum(payload.tail)
  });
}

// ============================================================================
// Higher-Order GADTs - Extra Credit
// ============================================================================

/**
 * Higher-order GADT where payloads themselves are type constructors
 */
export type HigherOrderGADT<F extends Kind1> =
  | GADT<'Pure', { value: Apply<F, [any]> }>
  | GADT<'Bind', { 
      value: Apply<F, [any]>; 
      f: (x: any) => Apply<F, [any]> 
    }>;

/**
 * HigherOrderGADT as HKT
 */
export interface HigherOrderGADTK extends Kind1 {
  readonly type: HigherOrderGADT<this['arg0']>;
}

/**
 * Constructor functions for HigherOrderGADT
 */
export const HigherOrderGADT = {
  Pure: <F extends Kind1>(value: Apply<F, [any]>): HigherOrderGADT<F> => 
    ({ tag: 'Pure', payload: { value } }),
  Bind: <F extends Kind1>(
    value: Apply<F, [any]>, 
    f: (x: any) => Apply<F, [any]>
  ): HigherOrderGADT<F> => 
    ({ tag: 'Bind', payload: { value, f } })
};

// ============================================================================
// Derivable Pattern Match - Extra Credit
// ============================================================================

/**
 * Helper to derive type-safe pattern matchers for any GADT
 */
export type DerivablePatternMatch<A, Tag extends string, Payload> = {
  [K in Tag]: (payload: Payload) => any;
};

/**
 * Auto-generate pattern matcher for a GADT
 */
export function derivePatternMatch<A, Tag extends string, Payload>(
  gadt: GADT<Tag, Payload>,
  handlers: Partial<DerivablePatternMatch<A, Tag, Payload>>
): any {
  const handler = handlers[gadt.tag as keyof typeof handlers];
  if (!handler) {
    throw new Error(`No handler for case: ${gadt.tag}`);
  }
  return handler(gadt.payload);
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example: Using MaybeGADT with derivable instances
 */
export function exampleMaybeGADT(): void {
  // Derive Monad from minimal definitions
  const of = <A>(a: A): MaybeGADT<A> => MaybeGADT.Just(a);
  const chain = <A, B>(fa: MaybeGADT<A>, f: (a: A) => MaybeGADT<B>): MaybeGADT<B> => 
    matchMaybe(fa, {
      Just: (value) => f(value),
      Nothing: () => MaybeGADT.Nothing()
    });
  
  const derivedMaybeMonad = deriveMonad<MaybeGADTK>(of, chain);
  
  // Test the derived instance
  const result = derivedMaybeMonad.chain(
    MaybeGADT.Just(5),
    (x) => x > 3 ? MaybeGADT.Just(x * 2) : MaybeGADT.Nothing()
  );
  
  console.log('Derived MaybeGADT Monad:', result); // Just(10)
}

/**
 * Example: Type-safe expression evaluation
 */
export function exampleExprEvaluation(): void {
  // This should compile - valid number expression
  const validExpr: Expr<number> = Expr.Add(
    Expr.Const(5),
    Expr.Add(Expr.Const(3), Expr.Const(2))
  );
  
  const result = evaluate(validExpr);
  console.log('Expression evaluation:', result); // 10
  
  // This would be a compile error if uncommented:
  // const invalidExpr: Expr<number> = Expr.Add(
  //   Expr.Const("hello"), // Error: string not assignable to number
  //   Expr.Const(3)
  // );
}

/**
 * Example: Type-safe string transformation
 */
export function exampleStringTransformation(): void {
  const stringExpr: Expr<string> = Expr.If(
    Expr.Const(true),
    Expr.Const("hello"),
    Expr.Const("world")
  );
  
  const transformed = transformString(stringExpr);
  console.log('String transformation:', transformed); // If with "HELLO" and "WORLD"
}

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * GADT Laws:
 * 
 * 1. Pattern Matching Completeness: All constructors must be handled in exhaustive matches
 * 2. Type Safety: Pattern matching preserves type information
 * 3. Constructor Injectivity: Each constructor uniquely identifies its payload type
 * 4. Exhaustiveness: Compile-time checking ensures all cases are covered
 * 
 * Pattern Matching Laws:
 * 
 * 1. Identity: match(gadt, { [tag]: (payload) => gadt }) = gadt
 * 2. Composition: match(gadt, f) |> g = match(gadt, { [tag]: (payload) => g(f[tag](payload)) })
 * 3. Exhaustiveness: match must handle all constructors or be explicitly partial
 * 
 * Integration Laws:
 * 
 * 1. HKT Compatibility: GADTs can be treated as type constructors
 * 2. Typeclass Laws: GADT instances must satisfy typeclass laws
 * 3. Derivation Compatibility: Derivable instances work with GADT implementations
 */ 

// ============================================================================
// Registration
// ============================================================================

/**
 * Register GADT typeclass instances
 */
export function registerGADTInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register ListGADT instances
    registry.register('ListGADTFunctor', ListGADTFunctor);
    
    // Register EitherGADT instances
    registry.register('EitherGADTBifunctor', EitherGADTBifunctor);
  }
}

// Auto-register instances
registerGADTInstances(); 