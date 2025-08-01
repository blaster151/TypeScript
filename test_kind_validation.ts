// Test file to verify Kind validation features

// ✅ Valid cases
type Valid1 = Kind<string>;
type Valid2 = Kind<number, boolean>;
type Valid3 = ns.Kind<string>;

// ❌ Invalid cases - should produce errors
// type Invalid1 = kind<string>; // lowercase 'kind' should be rejected
// type Invalid2 = Kind<>; // empty type arguments should be rejected
// type Invalid3 = Kind; // missing type arguments should be rejected

// Test in various contexts
interface TestInterface {
    prop: Kind<string>;
}

type TestGeneric<T extends Kind<string>> = T;

function testFunction(param: Kind<number>): Kind<boolean> {
    return {} as any;
}

// Test qualified names
namespace MyNamespace {
    export type Test = Kind<string>;
}

type QualifiedTest = MyNamespace.Kind<string>; 