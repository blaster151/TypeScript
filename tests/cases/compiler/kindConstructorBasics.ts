// KindConstructorBasics: TypeConstructorType assignment and constraint tests

// Correct: unary type constructor
 type List<T> = T[];
 type MyListKind = Kind<[Type]>; // OK: Kind with arity 1

// Correct: binary type constructor
 type Pair<A, B> = [A, B];
// Use Pair<any, any> to avoid generic type error in assignment
 type MyPairKind = Kind<[Type, Type]>; // OK: Kind with arity 2

// Error: wrong arity (should error in a real Kind system)
// type MyWrongArity = Kind<[Type]>; // Error: Pair expects 2 type arguments, Kind expects 1

// Error: not a type constructor (should error in a real Kind system)
// type NotAConstructor = Kind<[Type]>; // Error: number is not a type constructor

// Constraint error: assign a value of wrong kind (should error in a real Kind system)
// type MyListKind2 = Kind<[Type, Type]>; // Error: List is unary, Kind expects binary

// Correct: higher-kinded assignment
 type Functor2<F extends Kind<[Type, Type]>> = any;
 type MyFunctor = Functor2<Pair<any, any>>; // OK
// @ts-expect-error
 type MyFunctorWrong = Functor2<List>; // Error: List is not binary 