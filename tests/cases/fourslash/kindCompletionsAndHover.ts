// @filename: kindCompletionsAndHover.ts
// @allowNonTsExtensions: true
// @noUnusedLocals: true

// Type constructors in scope
 type List<T> = T[];
 type Option<T> = { value?: T };
 type Pair<A, B> = [A, B];
 type Triple<A, B, C> = [A, B, C];
 type NotAConstructor = number;

// Completion: should suggest List, Option (arity 1) in Kind<[Type]>
type K1 = Kind<[Type]>; // completion1

// Completion: should suggest Pair (arity 2) in Kind<[Type, Type]>
type K2 = Kind<[Type, Type]>; // completion2

// Completion: should suggest Triple (arity 3) in Kind<[Type, Type, Type]>
type K3 = Kind<[Type, Type, Type]>; // completion3

// Hover: should show kind signature, arity, parameter kinds
//    ^hover1
 type Hovered = Kind<[Type]>;
//         ^hover2
 type Hovered2 = Kind<[Type, Type]>;

//// Fourslash verification
// == Completion 1: Only unary type constructors ==
// @completion1: List, Option
verify.completions({
    marker: "completion1",
    includes: [
        { name: "List", kind: "type" },
        { name: "Option", kind: "type" },
    ],
    excludes: ["Pair", "Triple", "NotAConstructor"],
});

// == Completion 2: Only binary type constructors ==
// @completion2: Pair
verify.completions({
    marker: "completion2",
    includes: [
        { name: "Pair", kind: "type" },
    ],
    excludes: ["List", "Option", "Triple", "NotAConstructor"],
});

// == Completion 3: Only triple type constructors ==
// @completion3: Triple
verify.completions({
    marker: "completion3",
    includes: [
        { name: "Triple", kind: "type" },
    ],
    excludes: ["List", "Option", "Pair", "NotAConstructor"],
});

// == Hover/QuickInfo ==
// @hover1: List in Kind<[Type]>
verify.quickInfoAt("hover1", "type List<T> = T[]\nKind signature: Kind<Type> (arity: 1)");
// @hover2: Pair in Kind<[Type, Type]>
verify.quickInfoAt("hover2", "type Pair<A, B> = [A, B]\nKind signature: Kind<Type, Type> (arity: 2)"); 