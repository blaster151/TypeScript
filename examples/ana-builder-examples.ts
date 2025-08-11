import { Expr, ListGADT } from '../fp-gadt-enhanced';
import { Build, Done, More, anaExprBuilder, anaListBuilder } from '../fp-anamorphisms';

// Example: Use anaExprBuilder to build a countdown sum expression via builder coalgebra
export function exampleAnaExprBuilder(n: number): Expr<number> {
  const coalg = (seed: number): Build<Expr<number>, number> => {
    if (seed <= 0) return Done(Expr.Const(0));
    return More({ tail: seed - 1 }, (kids) => Expr.Add(Expr.Const(seed), kids.tail as Expr<number>));
  };
  return anaExprBuilder<number, number>(coalg)(n);
}

// Example: Use anaListBuilder to build a numeric range list via builder coalgebra
export function exampleAnaListBuilder(start: number, end: number): ListGADT<number> {
  type Range = { start: number; end: number };
  const coalg = (r: Range): Build<ListGADT<number>, Range> => {
    if (r.start >= r.end) return Done(ListGADT.Nil());
    const next: Range = { start: r.start + 1, end: r.end };
    return More({ tail: next }, (kids) => ListGADT.Cons(r.start, kids.tail as ListGADT<number>));
  };
  return anaListBuilder<number, Range>(coalg)({ start, end });
}


