# Recursion-schemes quick notes

- Use `Recursive/Corecursive` to wrap your datatypes without requiring a fixed-point.
- `para` gives you each child both as original `T` and the folded result `A`.
- `apo` lets an unfold short-circuit with an existing `T`.
- `histo`/`futu` reuse your `Cofree`/`Free` to expose course-of-values recursion/productive unfolds.

```ts
// Example sketch (pseudo-functor TreeF)
const Sum = cata(TreeFFunctor, TreeRecursive, (fA) => foldSum(fA));
const SizeWithRaw = para(TreeFFunctor, TreeRecursive, (fPairs) => foldSize(fPairs));
```


