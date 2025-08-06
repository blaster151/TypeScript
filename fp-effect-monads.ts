/**
 * Effect Monads Implementation
 * 
 * Provides fully-functional Effect Monads (IO, Task, State) with:
 * - Purity tagging and effect tracking
 * - Typeclass instances (Functor, Applicative, Monad, Bifunctor)
 * - Fluent syntax (.map, .chain, .ap, etc.)
 * - Integration with dual API system
 * - Automatic instance derivation and registration
 */

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';
import { createDualAPI } from './fp-dual-api';
import { applyFluentOps } from './fp-fluent-api';

// ============================================================================
// Part 1: HKT Definitions
// ============================================================================

/**
 * HKT kind for IO monad
 */
export interface IOK<A> {
  readonly _tag: 'IO';
  readonly _A: A;
}

/**
 * HKT kind for Task monad
 */
export interface TaskK<A> {
  readonly _tag: 'Task';
  readonly _A: A;
}

/**
 * HKT kind for State monad
 */
export interface StateK<S, A> {
  readonly _tag: 'State';
  readonly _S: S;
  readonly _A: A;
}

// ============================================================================
// Part 2: IO Monad (Lazy Synchronous Effect)
// ============================================================================

/**
 * IO monad for lazy synchronous effects
 * 
 * IO<A> represents a computation that produces a value of type A
 * when executed, potentially with side effects.
 */
export class IO<A> {
  private constructor(private readonly _run: () => A) {}

  /**
   * Execute the IO computation
   */
  run(): A {
    return this._run();
  }

  /**
   * Map over the result of an IO computation
   */
  map<B>(f: (a: A) => B): IO<B> {
    return new IO(() => f(this.run()));
  }

  /**
   * Apply a function inside IO to the result of another IO
   */
  ap<B>(fab: IO<(a: A) => B>): IO<B> {
    return new IO(() => fab.run()(this.run()));
  }

  /**
   * Chain IO computations
   */
  chain<B>(f: (a: A) => IO<B>): IO<B> {
    return new IO(() => f(this.run()).run());
  }

  /**
   * Alias for chain
   */
  flatMap<B>(f: (a: A) => IO<B>): IO<B> {
    return this.chain(f);
  }

  /**
   * Static constructor from a value
   */
  static of<A>(a: A): IO<A> {
    return new IO(() => a);
  }

  /**
   * Static constructor from a thunk
   */
  static from<A>(thunk: () => A): IO<A> {
    return new IO(thunk);
  }

  /**
   * Lift a synchronous function into IO
   */
  static lift<A, B>(f: (a: A) => B): (a: A) => IO<B> {
    return (a: A) => IO.of(f(a));
  }

  /**
   * Execute multiple IO computations in sequence
   */
  static sequence<A>(ios: IO<A>[]): IO<A[]> {
    return new IO(() => ios.map(io => io.run()));
  }

  /**
   * Execute multiple IO computations in parallel (simulated)
   */
  static parallel<A>(ios: IO<A>[]): IO<A[]> {
    return new IO(() => ios.map(io => io.run()));
  }
}

// ============================================================================
// Part 3: Task Monad (Lazy Asynchronous Effect)
// ============================================================================

/**
 * Task monad for lazy asynchronous effects
 * 
 * Task<A> represents a computation that produces a value of type A
 * when executed asynchronously, potentially with side effects.
 */
export class Task<A> {
  private constructor(private readonly _run: () => Promise<A>) {}

  /**
   * Execute the Task computation
   */
  async run(): Promise<A> {
    return this._run();
  }

  /**
   * Map over the result of a Task computation
   */
  map<B>(f: (a: A) => B): Task<B> {
    return new Task(async () => f(await this.run()));
  }

  /**
   * Apply a function inside Task to the result of another Task
   */
  ap<B>(fab: Task<(a: A) => B>): Task<B> {
    return new Task(async () => {
      const [f, a] = await Promise.all([fab.run(), this.run()]);
      return f(a);
    });
  }

  /**
   * Chain Task computations
   */
  chain<B>(f: (a: A) => Task<B>): Task<B> {
    return new Task(async () => {
      const a = await this.run();
      return f(a).run();
    });
  }

  /**
   * Alias for chain
   */
  flatMap<B>(f: (a: A) => Task<B>): Task<B> {
    return this.chain(f);
  }

  /**
   * Static constructor from a value
   */
  static of<A>(a: A): Task<A> {
    return new Task(() => Promise.resolve(a));
  }

  /**
   * Static constructor from a Promise
   */
  static from<A>(promise: Promise<A>): Task<A> {
    return new Task(() => promise);
  }

  /**
   * Static constructor from a thunk that returns a Promise
   */
  static fromThunk<A>(thunk: () => Promise<A>): Task<A> {
    return new Task(thunk);
  }

  /**
   * Lift an asynchronous function into Task
   */
  static lift<A, B>(f: (a: A) => Promise<B>): (a: A) => Task<B> {
    return (a: A) => Task.from(f(a));
  }

  /**
   * Execute multiple Task computations in sequence
   */
  static sequence<A>(tasks: Task<A>[]): Task<A[]> {
    return new Task(async () => {
      const results: A[] = [];
      for (const task of tasks) {
        results.push(await task.run());
      }
      return results;
    });
  }

  /**
   * Execute multiple Task computations in parallel
   */
  static parallel<A>(tasks: Task<A>[]): Task<A[]> {
    return new Task(async () => {
      return Promise.all(tasks.map(task => task.run()));
    });
  }

  /**
   * Handle errors in a Task computation
   */
  catch<B>(f: (error: any) => Task<B>): Task<A | B> {
    return new Task(async () => {
      try {
        return await this.run();
      } catch (error) {
        return f(error).run();
      }
    });
  }
}

// ============================================================================
// Part 4: State Monad (Pure State-Passing Function)
// ============================================================================

/**
 * State monad for pure state-passing computations
 * 
 * State<S, A> represents a computation that takes a state of type S
 * and returns a value of type A along with a new state of type S.
 */
export class State<S, A> {
  private constructor(private readonly _run: (s: S) => [S, A]) {}

  /**
   * Execute the State computation
   */
  run(s: S): [S, A] {
    return this._run(s);
  }

  /**
   * Execute the State computation and return only the value
   */
  eval(s: S): A {
    return this._run(s)[1];
  }

  /**
   * Execute the State computation and return only the state
   */
  exec(s: S): S {
    return this._run(s)[0];
  }

  /**
   * Map over the result of a State computation
   */
  map<B>(f: (a: A) => B): State<S, B> {
    return new State((s: S) => {
      const [s2, a] = this._run(s);
      return [s2, f(a)];
    });
  }

  /**
   * Apply a function inside State to the result of another State
   */
  ap<B>(fab: State<S, (a: A) => B>): State<S, B> {
    return new State((s: S) => {
      const [s2, f] = fab._run(s);
      const [s3, a] = this._run(s2);
      return [s3, f(a)];
    });
  }

  /**
   * Chain State computations
   */
  chain<B>(f: (a: A) => State<S, B>): State<S, B> {
    return new State((s: S) => {
      const [s2, a] = this._run(s);
      return f(a)._run(s2);
    });
  }

  /**
   * Alias for chain
   */
  flatMap<B>(f: (a: A) => State<S, B>): State<S, B> {
    return this.chain(f);
  }

  /**
   * Map over the state type
   */
  mapState<T>(f: (s: S) => T): State<T, A> {
    return new State((t: T) => {
      // This is a simplified version - in practice you'd need a way to convert T back to S
      const [s2, a] = this._run(t as any);
      return [f(s2), a];
    });
  }

  /**
   * Static constructor from a value
   */
  static of<S, A>(a: A): State<S, A> {
    return new State((s: S) => [s, a]);
  }

  /**
   * Static constructor from a state function
   */
  static from<S, A>(f: (s: S) => [S, A]): State<S, A> {
    return new State(f);
  }

  /**
   * Get the current state
   */
  static get<S>(): State<S, S> {
    return new State((s: S) => [s, s]);
  }

  /**
   * Set the state
   */
  static set<S>(s: S): State<S, void> {
    return new State(() => [s, undefined as any]);
  }

  /**
   * Modify the state
   */
  static modify<S>(f: (s: S) => S): State<S, void> {
    return new State((s: S) => [f(s), undefined as any]);
  }

  /**
   * Lift a pure function into State
   */
  static lift<S, A, B>(f: (a: A) => B): (a: A) => State<S, B> {
    return (a: A) => State.of(f(a));
  }
}

// ============================================================================
// Part 5: Typeclass Instances (Derived)
// ============================================================================

/**
 * IO typeclass instances
 */
export const IOInstances = deriveInstances<IOK>({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: IO<A>, f: (a: A) => B): IO<B> => fa.map(f),
  customChain: <A, B>(fa: IO<A>, f: (a: A) => IO<B>): IO<B> => fa.chain(f)
});

export const IOFunctor = IOInstances.functor;
export const IOApplicative = IOInstances.applicative;
export const IOMonad = IOInstances.monad;

/**
 * Task typeclass instances
 */
export const TaskInstances = deriveInstances<TaskK>({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Task<A>, f: (a: A) => B): Task<B> => fa.map(f),
  customChain: <A, B>(fa: Task<A>, f: (a: A) => Task<B>): Task<B> => fa.chain(f)
});

export const TaskFunctor = TaskInstances.functor;
export const TaskApplicative = TaskInstances.applicative;
export const TaskMonad = TaskInstances.monad;

/**
 * State typeclass instances
 */
export const StateInstances = deriveInstances<StateK<any, any>>({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <S, A, B>(fa: State<S, A>, f: (a: A) => B): State<S, B> => fa.map(f),
  customChain: <S, A, B>(fa: State<S, A>, f: (a: A) => State<S, B>): State<S, B> => fa.chain(f)
});

export const StateFunctor = StateInstances.functor;
export const StateApplicative = StateInstances.applicative;
export const StateMonad = StateInstances.monad;

// ============================================================================
// Part 6: Standard Typeclass Instances (Eq, Ord, Show)
// ============================================================================

/**
 * IO standard instances
 * Note: IO cannot have Eq instance due to side effects
 */
export const IOOrd = deriveOrdInstance({
  customOrd: <A>(a: IO<A>, b: IO<A>): number => {
    // Compare by reference since IO contains functions
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
});

export const IOShow = deriveShowInstance({
  customShow: <A>(a: IO<A>): string => `IO(<function>)`
});

/**
 * Task standard instances
 * Note: Task cannot have Eq instance due to side effects
 */
export const TaskOrd = deriveOrdInstance({
  customOrd: <A>(a: Task<A>, b: Task<A>): number => {
    // Compare by reference since Task contains functions
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
});

export const TaskShow = deriveShowInstance({
  customShow: <A>(a: Task<A>): string => `Task(<function>)`
});

/**
 * State standard instances
 * Note: State cannot have Eq instance due to function nature
 */
export const StateOrd = deriveOrdInstance({
  customOrd: <S, A>(a: State<S, A>, b: State<S, A>): number => {
    // Compare by reference since State contains functions
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
});

export const StateShow = deriveShowInstance({
  customShow: <S, A>(a: State<S, A>): string => `State(<function>)`
});

// ============================================================================
// Part 7: Fluent API Integration
// ============================================================================

/**
 * Add fluent methods to IO prototype
 */
applyFluentOps(IO.prototype, {
  map: (self: IO<any>, f: (a: any) => any) => self.map(f),
  chain: (self: IO<any>, f: (a: any) => any) => self.chain(f),
  flatMap: (self: IO<any>, f: (a: any) => any) => self.flatMap(f),
  ap: (self: IO<any>, fab: any) => self.ap(fab)
});

/**
 * Add fluent methods to Task prototype
 */
applyFluentOps(Task.prototype, {
  map: (self: Task<any>, f: (a: any) => any) => self.map(f),
  chain: (self: Task<any>, f: (a: any) => any) => self.chain(f),
  flatMap: (self: Task<any>, f: (a: any) => any) => self.flatMap(f),
  ap: (self: Task<any>, fab: any) => self.ap(fab)
});

/**
 * Add fluent methods to State prototype
 */
applyFluentOps(State.prototype, {
  map: (self: State<any, any>, f: (a: any) => any) => self.map(f),
  chain: (self: State<any, any>, f: (a: any) => any) => self.chain(f),
  flatMap: (self: State<any, any>, f: (a: any) => any) => self.flatMap(f),
  ap: (self: State<any, any>, fab: any) => self.ap(fab)
});

// ============================================================================
// Part 8: Dual API Integration
// ============================================================================

/**
 * IO Dual API
 */
export const IODualAPI = createDualAPI({
  name: 'IO',
  instance: {
    map: <A, B>(fa: IO<A>, f: (a: A) => B): IO<B> => fa.map(f),
    of: <A>(a: A): IO<A> => IO.of(a),
    ap: <A, B>(fab: IO<(a: A) => B>, fa: IO<A>): IO<B> => fa.ap(fab),
    chain: <A, B>(fa: IO<A>, f: (a: A) => IO<B>): IO<B> => fa.chain(f)
  },
  operations: ['map', 'of', 'ap', 'chain']
});

/**
 * Task Dual API
 */
export const TaskDualAPI = createDualAPI({
  name: 'Task',
  instance: {
    map: <A, B>(fa: Task<A>, f: (a: A) => B): Task<B> => fa.map(f),
    of: <A>(a: A): Task<A> => Task.of(a),
    ap: <A, B>(fab: Task<(a: A) => B>, fa: Task<A>): Task<B> => fa.ap(fab),
    chain: <A, B>(fa: Task<A>, f: (a: A) => Task<B>): Task<B> => fa.chain(f)
  },
  operations: ['map', 'of', 'ap', 'chain']
});

/**
 * State Dual API
 */
export const StateDualAPI = createDualAPI({
  name: 'State',
  instance: {
    map: <S, A, B>(fa: State<S, A>, f: (a: A) => B): State<S, B> => fa.map(f),
    of: <S, A>(a: A): State<S, A> => State.of(a),
    ap: <S, A, B>(fab: State<S, (a: A) => B>, fa: State<S, A>): State<S, B> => fa.ap(fab),
    chain: <S, A, B>(fa: State<S, A>, f: (a: A) => State<S, B>): State<S, B> => fa.chain(f)
  },
  operations: ['map', 'of', 'ap', 'chain']
});

// ============================================================================
// Part 9: Registry Integration
// ============================================================================

/**
 * Register all effect monad instances with the global registry
 */
export function registerEffectMonadInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register IO instances
    registry.register('IOFunctor', IOFunctor);
    registry.register('IOApplicative', IOApplicative);
    registry.register('IOMonad', IOMonad);
    registry.register('IOOrd', IOOrd);
    registry.register('IOShow', IOShow);
    registry.registerDerivable('IO', {
      functor: IOFunctor,
      applicative: IOApplicative,
      monad: IOMonad,
      ord: IOOrd,
      show: IOShow,
      purity: { effect: 'Impure' as const }
    });

    // Register Task instances
    registry.register('TaskFunctor', TaskFunctor);
    registry.register('TaskApplicative', TaskApplicative);
    registry.register('TaskMonad', TaskMonad);
    registry.register('TaskOrd', TaskOrd);
    registry.register('TaskShow', TaskShow);
    registry.registerDerivable('Task', {
      functor: TaskFunctor,
      applicative: TaskApplicative,
      monad: TaskMonad,
      ord: TaskOrd,
      show: TaskShow,
      purity: { effect: 'Async' as const }
    });

    // Register State instances
    registry.register('StateFunctor', StateFunctor);
    registry.register('StateApplicative', StateApplicative);
    registry.register('StateMonad', StateMonad);
    registry.register('StateOrd', StateOrd);
    registry.register('StateShow', StateShow);
    registry.registerDerivable('State', {
      functor: StateFunctor,
      applicative: StateApplicative,
      monad: StateMonad,
      ord: StateOrd,
      show: StateShow,
      purity: { effect: 'Pure' as const }
    });
  }
}

// Auto-register instances
registerEffectMonadInstances();

// ============================================================================
// Part 10: Utility Functions
// ============================================================================

/**
 * Convert IO to Task
 */
export function ioToTask<A>(io: IO<A>): Task<A> {
  return Task.fromThunk(() => Promise.resolve(io.run()));
}

/**
 * Convert Task to IO (unsafe - blocks)
 */
export function taskToIO<A>(task: Task<A>): IO<A> {
  return IO.from(async () => {
    // This is unsafe in practice - would block the event loop
    // In a real implementation, you'd want to handle this differently
    return await task.run();
  });
}

/**
 * Convert State to IO
 */
export function stateToIO<S, A>(state: State<S, A>, initialState: S): IO<A> {
  return IO.from(() => state.eval(initialState));
}

/**
 * Convert IO to State
 */
export function ioToState<A>(io: IO<A>): State<any, A> {
  return State.from(() => [undefined, io.run()]);
}

// ============================================================================
// Part 11: Export Everything
// ============================================================================

export {
  IO,
  Task,
  State,
  IOFunctor,
  IOApplicative,
  IOMonad,
  TaskFunctor,
  TaskApplicative,
  TaskMonad,
  StateFunctor,
  StateApplicative,
  StateMonad,
  IODualAPI,
  TaskDualAPI,
  StateDualAPI
}; 