/**
 * Core Adjunction Types (metadata-level witnesses)
 *
 * Defines two equivalent encodings of an adjunction F ⊣ G and a unifying witness.
 * - Unit/Counit encoding
 * - Hom-set isomorphism encoding
 *
 * These interfaces are expressed in terms of our KindScript HKT types and the
 * existing Functor dictionary from the typeclass system. No fp-ts/monocle-ts.
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';

// ============================================================================
// Unit/Counit Encoding
// ============================================================================

/**
 * Adjunction via unit/counit natural transformations.
 *
 * unit:   η_A: A → G(F A)
 * counit: ε_B: F(G B) → B
 */
export interface AdjunctionUnitCounit<F extends Kind1, G extends Kind1> {
  readonly F: F;
  readonly G: G;
  readonly unit: <A>(a: A) => Apply<G, [Apply<F, [A]>]>;
  readonly counit: <B>(fgb: Apply<F, [Apply<G, [B]>]>) => B;
}

// ============================================================================
// Hom-Set Isomorphism Encoding
// ============================================================================

/**
 * Adjunction via hom-set isomorphism natural in A and B.
 *
 * left:  φ   : Hom(F A, B) ≅ Hom(A, G B)  (forward)
 * right: φ⁻¹: Hom(A, G B) ≅ Hom(F A, B)  (backward)
 */
export interface AdjunctionHom<F extends Kind1, G extends Kind1> {
  readonly F: F;
  readonly G: G;
  readonly left: <A, B>(
    k: (fa: Apply<F, [A]>) => B
  ) => (a: A) => Apply<G, [B]>;
  readonly right: <A, B>(
    h: (a: A) => Apply<G, [B]>
  ) => (fa: Apply<F, [A]>) => B;
}

// ============================================================================
// Unifying Witness
// ============================================================================

/**
 * Unifying adjunction witness. Requires Functor dictionaries for F and G.
 * At least one encoding (unit/counit or hom-iso) should be provided. The other
 * can be derived at registration/integration time.
 */
export interface Adjunction<F extends Kind1, G extends Kind1> {
  readonly F: F;
  readonly G: G;
  readonly functorF: Functor<F>;
  readonly functorG: Functor<G>;

  // Unit/Counit encoding (optional)
  readonly unit?: AdjunctionUnitCounit<F, G>['unit'];
  readonly counit?: AdjunctionUnitCounit<F, G>['counit'];

  // Hom-set encoding (optional)
  readonly left?: AdjunctionHom<F, G>['left'];
  readonly right?: AdjunctionHom<F, G>['right'];

  // Optional diagnostics/evidence
  readonly evidence?: {
    readonly source: 'UnitCounit' | 'HomIso' | 'Mixed';
    readonly notes?: ReadonlyArray<string>;
  };
}

// ============================================================================
// Helpers (optional minimal adapters)
// ============================================================================

/**
 * Create a minimal Adjunction witness from a unit/counit encoding and functors.
 */
export function fromUnitCounit<F extends Kind1, G extends Kind1>(
  F: F,
  G: G,
  functorF: Functor<F>,
  functorG: Functor<G>,
  unit: AdjunctionUnitCounit<F, G>['unit'],
  counit: AdjunctionUnitCounit<F, G>['counit']
): Adjunction<F, G> {
  return {
    F,
    G,
    functorF,
    functorG,
    unit,
    counit,
    evidence: { source: 'UnitCounit' }
  };
}

/**
 * Create a minimal Adjunction witness from a hom-set isomorphism encoding and functors.
 */
export function fromHomIso<F extends Kind1, G extends Kind1>(
  F: F,
  G: G,
  functorF: Functor<F>,
  functorG: Functor<G>,
  left: AdjunctionHom<F, G>['left'],
  right: AdjunctionHom<F, G>['right']
): Adjunction<F, G> {
  return {
    F,
    G,
    functorF,
    functorG,
    left,
    right,
    evidence: { source: 'HomIso' }
  };
}

// ============================================================================
// Cross-derivation between encodings
// ============================================================================

/** Derive hom-set encoding from unit/counit. */
export function deriveHomFromUnitCounit<F extends Kind1, G extends Kind1>(
  F: F,
  G: G,
  functorF: Functor<F>,
  functorG: Functor<G>,
  unit: AdjunctionUnitCounit<F, G>['unit'],
  counit: AdjunctionUnitCounit<F, G>['counit']
): AdjunctionHom<F, G> {
  const left: AdjunctionHom<F, G>['left'] = <A, B>(k: (fa: Apply<F, [A]>) => B) =>
    (a: A): Apply<G, [B]> => functorG.map(unit(a), k);

  const right: AdjunctionHom<F, G>['right'] = <A, B>(h: (a: A) => Apply<G, [B]>) =>
    (fa: Apply<F, [A]>): B => counit(functorF.map(fa, h));

  return { F, G, left, right };
}

/** Derive unit/counit from hom-set encoding. */
export function deriveUnitCounitFromHom<F extends Kind1, G extends Kind1>(
  F: F,
  G: G,
  functorF: Functor<F>,
  functorG: Functor<G>,
  left: AdjunctionHom<F, G>['left'],
  right: AdjunctionHom<F, G>['right']
): AdjunctionUnitCounit<F, G> {
  const unit: AdjunctionUnitCounit<F, G>['unit'] = <A>(a: A): Apply<G, [Apply<F, [A]>]> =>
    left<A, Apply<F, [A]>>((fa) => fa)(a);

  const counit: AdjunctionUnitCounit<F, G>['counit'] = <B>(fgb: Apply<F, [Apply<G, [B]>]>) =>
    right<Apply<G, [B]>, B>((gb) => gb)(fgb);

  return { F, G, unit, counit };
}

/**
 * Normalize an adjunction witness to include both encodings where derivable.
 */
export function normalizeAdjunction<F extends Kind1, G extends Kind1>(
  adj: Adjunction<F, G>
): Adjunction<F, G> & Required<Pick<Adjunction<F, G>, 'unit' | 'counit' | 'left' | 'right'>> {
  const { F, G, functorF, functorG } = adj;
  let unit = adj.unit;
  let counit = adj.counit;
  let left = adj.left;
  let right = adj.right;

  if ((unit && counit) && (!left || !right)) {
    const hom = deriveHomFromUnitCounit(F, G, functorF, functorG, unit, counit);
    left = left ?? hom.left;
    right = right ?? hom.right;
  }
  if ((left && right) && (!unit || !counit)) {
    const uc = deriveUnitCounitFromHom(F, G, functorF, functorG, left, right);
    unit = unit ?? uc.unit;
    counit = counit ?? uc.counit;
  }

  return {
    ...adj,
    unit: unit!,
    counit: counit!,
    left: left!,
    right: right!,
    evidence: adj.evidence ?? { source: 'Mixed' }
  };
}


