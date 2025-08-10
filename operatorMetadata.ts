/**
 * Operator Metadata and Fusibility Matrix
 * 
 * Defines a registry of all stream operators in our State-monoid FRP algebra with
 * category classification, multiplicity impact, state models, and fusibility rules.
 * This metadata drives the compile-time FRP fusion pass with data-driven decisions.
 */

import * as ts from 'typescript';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Operator category classification
 */
export type OperatorCategory = 'stateless' | 'stateful';

/**
 * Multiplicity impact classification
 */
export type MultiplicityImpact = 'preserve' | 'increase' | 'conditional';

/**
 * State model for stateful operators
 */
export type StateModel = 'none' | 'ScanState<A>' | 'ReduceState<A>' | 'DistinctState<A>' | 'ThrottleState<A>' | 'DebounceState<A>' | 'BufferState<A>' | 'WindowState<A>' | 'TupleState<A,B>';

/**
 * Fusion type classification
 */
export type FusionType = 'stateless-only' | 'stateless-before-stateful' | 'stateful-before-stateless' | 'stateful-combine' | 'not-fusible';

/**
 * Operator information for fusion analysis
 */
export interface OperatorInfo {
  name: string;
  category: OperatorCategory;
  multiplicity: MultiplicityImpact;
  stateModel: StateModel;
  fusibleBefore: string[];
  fusibleAfter: string[];
  fusionRules: FusionRule[];
  algebraicLaws: AlgebraicLaw[];
  transformBuilder?: (op1: any, op2: any) => any;
  multiplicityPreservation: (source: MultiplicityImpact, target: MultiplicityImpact) => MultiplicityImpact;
  typePreservation: boolean;
  canInline: boolean;
  maxInlineStatements: number;
  preservesOrder: boolean;
  hasSideEffects: boolean;
}

/**
 * Fusion rule definition
 */
export interface FusionRule {
  targetOperator: string;
  fusionType: FusionType;
  condition: (source: OperatorInfo, target: OperatorInfo) => boolean;
  transformer: (source: ts.Expression, target: ts.Expression) => ts.Expression;
  multiplicityPreservation: (source: MultiplicityImpact, target: MultiplicityImpact) => MultiplicityImpact;
  typePreservation: boolean;
  notes: string;
}

/**
 * Algebraic law for operator simplification
 */
export interface AlgebraicLaw {
  name: string;
  pattern: string; // e.g., "map(f) ∘ map(g) = map(f ∘ g)"
  condition: (operators: string[]) => boolean;
  transformer: (operators: string[], expressions: ts.Expression[]) => ts.Expression;
  description: string;
}

/**
 * Fusibility matrix entry
 */
export interface FusibilityEntry {
  sourceOperator: string;
  targetOperator: string;
  canFuse: boolean;
  fusionType: FusionType;
  multiplicityPreservation: (source: MultiplicityImpact, target: MultiplicityImpact) => MultiplicityImpact;
  notes: string;
}

// ============================================================================
// Operator Registry
// ============================================================================

/**
 * Comprehensive operator registry for State-monoid FRP algebra
 */
export const operatorRegistry: Record<string, OperatorInfo> = {
  // ============================================================================
  // Stateless Operators
  // ============================================================================
  
  map: {
    name: 'map',
    category: 'stateless',
    multiplicity: 'preserve',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'scan', 'reduce', 'distinctUntilChanged', 'throttleTime', 'debounceTime', 'bufferCount', 'slidingWindow'],
    fusibleAfter: ['map', 'filter', 'flatMap', 'take', 'drop', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseMapMap,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'map(f) ∘ map(g) = map(f ∘ g)'
      },
      {
        targetOperator: 'filter',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseMapFilter,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'map(f) ∘ filter(p) = mapFilter(f, p)'
      },
      {
        targetOperator: 'scan',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: fuseMapScan,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'map(f) ∘ scan(g) = scan((acc, x) => g(acc, f(x)))'
      }
    ],
    algebraicLaws: [
      {
        name: 'map-composition',
        pattern: 'map(f) ∘ map(g) = map(f ∘ g)',
        condition: (operators) => operators.length >= 2 && operators[0] === 'map' && operators[1] === 'map',
        transformer: (operators, expressions) => createComposedMap(expressions[0], expressions[1]),
        description: 'Compose two map operations into a single map with composed functions'
      }
    ],
    transformBuilder: undefined, // Handled by fusion rules
    multiplicityPreservation: (source, target) => 'preserve',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 5,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  filter: {
    name: 'filter',
    category: 'stateless',
    multiplicity: 'conditional',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'scan', 'reduce', 'distinctUntilChanged', 'throttleTime', 'debounceTime', 'bufferCount', 'slidingWindow'],
    fusibleAfter: ['map', 'filter', 'flatMap', 'take', 'drop', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseFilterMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'filter(p) ∘ map(f) = filterMap(p, f)'
      },
      {
        targetOperator: 'filter',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseFilterFilter,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'filter(p1) ∘ filter(p2) = filter(x => p1(x) && p2(x))'
      }
    ],
    algebraicLaws: [
      {
        name: 'filter-conjunction',
        pattern: 'filter(p1) ∘ filter(p2) = filter(x => p1(x) && p2(x))',
        condition: (operators) => operators.length >= 2 && operators[0] === 'filter' && operators[1] === 'filter',
        transformer: (operators, expressions) => createConjoinedFilter(expressions[0], expressions[1]),
        description: 'Combine two filter operations into a single filter with conjoined predicates'
      }
    ],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 3,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  flatMap: {
    name: 'flatMap',
    category: 'stateless',
    multiplicity: 'increase',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'take', 'drop', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseFlatMapMap,
        multiplicityPreservation: (source, target) => 'increase',
        typePreservation: true,
        notes: 'flatMap(f) ∘ map(g) = flatMap(x => f(x).map(g))'
      }
    ],
    algebraicLaws: [
      {
        name: 'flatMap-map',
        pattern: 'flatMap(f) ∘ map(g) = flatMap(x => f(x).map(g))',
        condition: (operators) => operators.length >= 2 && operators[0] === 'flatMap' && operators[1] === 'map',
        transformer: (operators, expressions) => createFlatMapMap(expressions[0], expressions[1]),
        description: 'Push map operation inside flatMap'
      }
    ],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'increase',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: false,
    hasSideEffects: false
  },
  
  take: {
    name: 'take',
    category: 'stateless',
    multiplicity: 'conditional',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'flatMap'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseTakeMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'take(n) ∘ map(f) = takeMap(n, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 2,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  drop: {
    name: 'drop',
    category: 'stateless',
    multiplicity: 'conditional',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'flatMap'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseDropMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'drop(n) ∘ map(f) = dropMap(n, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 2,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  tap: {
    name: 'tap',
    category: 'stateless',
    multiplicity: 'preserve',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'flatMap', 'take', 'drop'],
    fusibleAfter: ['map', 'filter', 'flatMap', 'take', 'drop', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseTapMap,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'tap(f) ∘ map(g) = tapMap(f, g)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'preserve',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 3,
    preservesOrder: true,
    hasSideEffects: true
  },
  
  mapTo: {
    name: 'mapTo',
    category: 'stateless',
    multiplicity: 'preserve',
    stateModel: 'none',
    fusibleBefore: ['map', 'filter', 'flatMap', 'take', 'drop', 'tap'],
    fusibleAfter: ['map', 'filter', 'flatMap', 'take', 'drop', 'tap'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: fuseMapToMap,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'mapTo(v) ∘ map(f) = mapTo(f(v))'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'preserve',
    typePreservation: true,
    canInline: true,
    maxInlineStatements: 2,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  // ============================================================================
  // Stateful Operators
  // ============================================================================
  
  scan: {
    name: 'scan',
    category: 'stateful',
    multiplicity: 'preserve',
    stateModel: 'ScanState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseScanMap,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'scan(f) ∘ map(g) = scan((acc, x) => map(g)(f(acc, x)))'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'preserve',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  reduce: {
    name: 'reduce',
    category: 'stateful',
    multiplicity: 'preserve',
    stateModel: 'ReduceState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseReduceMap,
        multiplicityPreservation: (source, target) => 'preserve',
        typePreservation: true,
        notes: 'reduce(f) ∘ map(g) = reduce((acc, x) => f(acc, g(x)))'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'preserve',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  distinctUntilChanged: {
    name: 'distinctUntilChanged',
    category: 'stateful',
    multiplicity: 'conditional',
    stateModel: 'DistinctState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseDistinctMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'distinctUntilChanged ∘ map(f) = distinctUntilChangedMap(f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  throttleTime: {
    name: 'throttleTime',
    category: 'stateful',
    multiplicity: 'conditional',
    stateModel: 'ThrottleState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseThrottleMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'throttleTime(t) ∘ map(f) = throttleTimeMap(t, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  debounceTime: {
    name: 'debounceTime',
    category: 'stateful',
    multiplicity: 'conditional',
    stateModel: 'DebounceState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseDebounceMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'debounceTime(t) ∘ map(f) = debounceTimeMap(t, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  bufferCount: {
    name: 'bufferCount',
    category: 'stateful',
    multiplicity: 'conditional',
    stateModel: 'BufferState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseBufferMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'bufferCount(n) ∘ map(f) = bufferCountMap(n, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  },
  
  slidingWindow: {
    name: 'slidingWindow',
    category: 'stateful',
    multiplicity: 'conditional',
    stateModel: 'WindowState<A>',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'tap', 'mapTo'],
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateful-before-stateless',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: fuseWindowMap,
        multiplicityPreservation: (source, target) => 'conditional',
        typePreservation: true,
        notes: 'slidingWindow(n) ∘ map(f) = slidingWindowMap(n, f)'
      }
    ],
    algebraicLaws: [],
    transformBuilder: undefined,
    multiplicityPreservation: (source, target) => 'conditional',
    typePreservation: true,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false
  }
};

// ============================================================================
// Fusibility Matrix
// ============================================================================

/**
 * Comprehensive fusibility matrix for operator combinations
 */
export const fusibilityMatrix: FusibilityEntry[] = [
  // Stateless + Stateless combinations
  { sourceOperator: 'map', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ map(g) = map(f ∘ g)' },
  { sourceOperator: 'map', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ filter(p) = mapFilter(f, p)' },
  { sourceOperator: 'map', targetOperator: 'flatMap', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'map(f) ∘ flatMap(g) = flatMap(x => g(f(x)))' },
  { sourceOperator: 'map', targetOperator: 'take', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ take(n) = takeMap(n, f)' },
  { sourceOperator: 'map', targetOperator: 'drop', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ drop(n) = dropMap(n, f)' },
  { sourceOperator: 'map', targetOperator: 'tap', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ tap(g) = tapMap(f, g)' },
  { sourceOperator: 'map', targetOperator: 'mapTo', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ mapTo(v) = mapTo(f(v))' },
  
  { sourceOperator: 'filter', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ map(f) = filterMap(p, f)' },
  { sourceOperator: 'filter', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p1) ∘ filter(p2) = filter(x => p1(x) && p2(x))' },
  { sourceOperator: 'filter', targetOperator: 'flatMap', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'filter(p) ∘ flatMap(f) = flatMap(x => p(x) ? f(x) : [])' },
  { sourceOperator: 'filter', targetOperator: 'take', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ take(n) = takeFilter(n, p)' },
  { sourceOperator: 'filter', targetOperator: 'drop', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ drop(n) = dropFilter(n, p)' },
  { sourceOperator: 'filter', targetOperator: 'tap', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ tap(f) = tapFilter(p, f)' },
  { sourceOperator: 'filter', targetOperator: 'mapTo', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ mapTo(v) = filterMapTo(p, v)' },
  
  { sourceOperator: 'flatMap', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ map(g) = flatMap(x => f(x).map(g))' },
  { sourceOperator: 'flatMap', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ filter(p) = flatMap(x => f(x).filter(p))' },
  { sourceOperator: 'flatMap', targetOperator: 'take', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ take(n) = flatMapTake(f, n)' },
  { sourceOperator: 'flatMap', targetOperator: 'drop', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ drop(n) = flatMapDrop(f, n)' },
  { sourceOperator: 'flatMap', targetOperator: 'tap', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ tap(g) = flatMapTap(f, g)' },
  { sourceOperator: 'flatMap', targetOperator: 'mapTo', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => 'increase', notes: 'flatMap(f) ∘ mapTo(v) = flatMapMapTo(f, v)' },
  
  // Stateless + Stateful combinations
  { sourceOperator: 'map', targetOperator: 'scan', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ scan(g) = scan((acc, x) => g(acc, f(x)))' },
  { sourceOperator: 'map', targetOperator: 'reduce', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'preserve', notes: 'map(f) ∘ reduce(g) = reduce((acc, x) => g(acc, f(x)))' },
  { sourceOperator: 'map', targetOperator: 'distinctUntilChanged', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ distinctUntilChanged = distinctUntilChangedMap(f)' },
  { sourceOperator: 'map', targetOperator: 'throttleTime', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ throttleTime(t) = throttleTimeMap(t, f)' },
  { sourceOperator: 'map', targetOperator: 'debounceTime', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ debounceTime(t) = debounceTimeMap(t, f)' },
  { sourceOperator: 'map', targetOperator: 'bufferCount', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ bufferCount(n) = bufferCountMap(n, f)' },
  { sourceOperator: 'map', targetOperator: 'slidingWindow', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'map(f) ∘ slidingWindow(n) = slidingWindowMap(n, f)' },
  
  { sourceOperator: 'filter', targetOperator: 'scan', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ scan(g) = scanFilter(p, g)' },
  { sourceOperator: 'filter', targetOperator: 'reduce', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ reduce(g) = reduceFilter(p, g)' },
  { sourceOperator: 'filter', targetOperator: 'distinctUntilChanged', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ distinctUntilChanged = distinctUntilChangedFilter(p)' },
  { sourceOperator: 'filter', targetOperator: 'throttleTime', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ throttleTime(t) = throttleTimeFilter(t, p)' },
  { sourceOperator: 'filter', targetOperator: 'debounceTime', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ debounceTime(t) = debounceTimeFilter(t, p)' },
  { sourceOperator: 'filter', targetOperator: 'bufferCount', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ bufferCount(n) = bufferCountFilter(n, p)' },
  { sourceOperator: 'filter', targetOperator: 'slidingWindow', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => 'conditional', notes: 'filter(p) ∘ slidingWindow(n) = slidingWindowFilter(n, p)' },
  
  // Stateful + Stateless combinations
  { sourceOperator: 'scan', targetOperator: 'map', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'scan(f) ∘ map(g) = scanMap(f, g)' },
  { sourceOperator: 'scan', targetOperator: 'filter', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'conditional', notes: 'scan(f) ∘ filter(p) = scanFilter(f, p)' },
  { sourceOperator: 'scan', targetOperator: 'tap', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'scan(f) ∘ tap(g) = scanTap(f, g)' },
  { sourceOperator: 'scan', targetOperator: 'mapTo', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'scan(f) ∘ mapTo(v) = scanMapTo(f, v)' },
  
  { sourceOperator: 'reduce', targetOperator: 'map', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'reduce(f) ∘ map(g) = reduceMap(f, g)' },
  { sourceOperator: 'reduce', targetOperator: 'filter', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'conditional', notes: 'reduce(f) ∘ filter(p) = reduceFilter(f, p)' },
  { sourceOperator: 'reduce', targetOperator: 'tap', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'reduce(f) ∘ tap(g) = reduceTap(f, g)' },
  { sourceOperator: 'reduce', targetOperator: 'mapTo', canFuse: true, fusionType: 'stateful-before-stateless', multiplicityPreservation: (s, t) => 'preserve', notes: 'reduce(f) ∘ mapTo(v) = reduceMapTo(f, v)' },
  
  // Stateful + Stateful combinations (limited)
  { sourceOperator: 'scan', targetOperator: 'scan', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => 'preserve', notes: 'Complex state combination' },
  { sourceOperator: 'reduce', targetOperator: 'reduce', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => 'preserve', notes: 'Complex state combination' },
  { sourceOperator: 'scan', targetOperator: 'reduce', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => 'preserve', notes: 'Complex state combination' },
  { sourceOperator: 'reduce', targetOperator: 'scan', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => 'preserve', notes: 'Complex state combination' }
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get operator information by name
 */
export function getOperatorInfo(name: string): OperatorInfo | undefined {
  return operatorRegistry[name];
}

/**
 * Check if two operators can be fused
 */
export function canFuse(sourceOperator: string, targetOperator: string): boolean {
  const entry = fusibilityMatrix.find(e => 
    e.sourceOperator === sourceOperator && e.targetOperator === targetOperator
  );
  return entry?.canFuse ?? false;
}

/**
 * Get fusion type for operator combination
 */
export function getFusionType(sourceOperator: string, targetOperator: string): FusionType | undefined {
  const entry = fusibilityMatrix.find(e => 
    e.sourceOperator === sourceOperator && e.targetOperator === targetOperator
  );
  return entry?.fusionType;
}

/**
 * Calculate multiplicity preservation for operator combination
 */
export function calculateMultiplicityPreservation(
  sourceOperator: string, 
  targetOperator: string, 
  sourceMultiplicity: MultiplicityImpact, 
  targetMultiplicity: MultiplicityImpact
): MultiplicityImpact {
  const entry = fusibilityMatrix.find(e => 
    e.sourceOperator === sourceOperator && e.targetOperator === targetOperator
  );
  return entry?.multiplicityPreservation(sourceMultiplicity, targetMultiplicity) ?? 'increase';
}

/**
 * Get all operator names
 */
export function getAllOperatorNames(): string[] {
  return Object.keys(operatorRegistry);
}

/**
 * Get operators by category
 */
export function getOperatorsByCategory(category: OperatorCategory): string[] {
  return Object.entries(operatorRegistry)
    .filter(([_, info]) => info.category === category)
    .map(([name, _]) => name);
}

/**
 * Get all fusable operator combinations
 */
export function getFusableCombinations(): FusibilityEntry[] {
  return fusibilityMatrix.filter(entry => entry.canFuse);
}

/**
 * Get fusion rules for an operator
 */
export function getFusionRules(operatorName: string): FusionRule[] {
  const info = operatorRegistry[operatorName];
  return info?.fusionRules ?? [];
}

/**
 * Get algebraic laws for an operator
 */
export function getAlgebraicLaws(operatorName: string): AlgebraicLaw[] {
  const info = operatorRegistry[operatorName];
  return info?.algebraicLaws ?? [];
}

/**
 * Check if operator preserves order
 */
export function preservesOrder(operatorName: string): boolean {
  const info = operatorRegistry[operatorName];
  return info?.preservesOrder ?? false;
}

/**
 * Check if operator has side effects
 */
export function hasSideEffects(operatorName: string): boolean {
  const info = operatorRegistry[operatorName];
  return info?.hasSideEffects ?? false;
}

/**
 * Check if operator can be inlined
 */
export function canInline(operatorName: string): boolean {
  const info = operatorRegistry[operatorName];
  return info?.canInline ?? false;
}

/**
 * Get maximum inline statements for operator
 */
export function getMaxInlineStatements(operatorName: string): number {
  const info = operatorRegistry[operatorName];
  return info?.maxInlineStatements ?? 0;
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running in a TypeScript transformer environment
if (typeof global !== 'undefined' && (global as any).__OPERATOR_METADATA__) {
  console.log('[Operator Metadata] Registry initialized');
} 