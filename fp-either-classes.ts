/**
 * Thin class wrappers for Either that delegate to the unified builder-based implementation.
 * Keeps class-based API available while ensuring a single source of semantics.
 */

import { Either, Left, Right, isLeft, isRight } from './fp-either-unified';
import { EITHER_OPS } from './fp-either-ops-table';

const toUnified = <L, R>(x: Either<L, R> | LeftClass<L> | RightClass<R>): Either<L, R> =>
  x instanceof LeftClass ? Left<L>(x.value as L) as any
  : x instanceof RightClass ? Right<R>(x.value as R) as any
  : (x as Either<L, R>);

const wrap = <L, R>(e: Either<L, R>) => (isLeft(e) ? new LeftClass<L>(e.value as L) : new RightClass<R>(e.value as R));

export class LeftClass<L> {
  readonly tag = 'Left' as const;
  constructor(public readonly value: L) {}
  toUnified(): Either<L, never> { return Left<L>(this.value) as any; }

  // Fluent adapters
  map<R2>(_f: (r: never) => R2): LeftClass<L> { return this; }
  chain<L2, R2>(_f: (r: never) => Either<L2, R2> | LeftClass<L2> | RightClass<R2>): LeftClass<L> { return this; }
  bimap<L2, R2>(fl: (l: L) => L2, _fr: (r: never) => R2): LeftClass<L2> { return new LeftClass<L2>(fl(this.value)); }
  mapLeft<L2>(fl: (l: L) => L2): LeftClass<L2> { return new LeftClass<L2>(fl(this.value)); }
  getOrElse<R>(onLeft: () => R): R { return onLeft(); }
}

export class RightClass<R> {
  readonly tag = 'Right' as const;
  constructor(public readonly value: R) {}
  toUnified(): Either<never, R> { return Right<R>(this.value) as any; }

  // Fluent adapters
  map<R2>(f: (r: R) => R2) { return wrap(EITHER_OPS.map<never, R, R2>(f, this.toUnified())); }
  chain<L2, R2>(f: (r: R) => Either<L2, R2> | LeftClass<L2> | RightClass<R2>) {
    const lifted = (r: R) => toUnified(f(r));
    return wrap(EITHER_OPS.chain<L2, R, R2>(lifted, this.toUnified()));
  }
  bimap<L2, R2>(_fl: (l: never) => L2, fr: (r: R) => R2) { return wrap(EITHER_OPS.bimap<never, R, L2, R2>((l) => l as never, fr, this.toUnified() as any)); }
  mapLeft<L2>(_fl: (l: never) => L2): RightClass<R> { return this; }
  getOrElse<R2>(_onLeft: () => R2): R | R2 { return this.value; }
}

export { Either, Left, Right, isLeft, isRight };


