// Test invalid Kind syntax
type Test1 = kind<string>; // Should be rejected (lowercase)
type Test2 = Kind<>; // Should be rejected (empty type args) 