import { assert } from "chai";
import {
  Tagged, inferProfunctor, dimap, lmap, rmap, Auto
} from '../../../fp-registry-init';

describe('Profunctor Inference Utilities', () => {
  it('should dimap functions using inferred Profunctor', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const dimapResult = dimap(
      taggedFunction,
      (s: string) => parseInt(s),  // contramap: string -> number
      (n: number) => n.toString()  // map: number -> string
    );
    
    assert.equal(dimapResult.value("10"), "20", 'Function Profunctor dimap');
  });

  it('should lmap functions (contramap on first parameter)', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const lmapResult = lmap(taggedFunction, (s: string) => parseInt(s));
    assert.equal(lmapResult.value("5"), 10, 'Function Profunctor lmap');
  });

  it('should rmap functions (map on second parameter)', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const rmapResult = rmap(taggedFunction, (n: number) => n.toString());
    assert.equal(rmapResult.value(5), "10", 'Function Profunctor rmap');
  });

  it('should support fluent Auto API for Profunctor operations', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const autoFunction = new Auto(taggedFunction);
    
    // Test dimap
    const dimapResult = autoFunction
      .dimap((s: string) => parseInt(s), (n: number) => n.toString())
      .unwrap();
    assert.equal(dimapResult("10"), "20", 'Auto fluent dimap');
    
    // Test lmap
    const lmapResult = autoFunction
      .lmap((s: string) => parseInt(s))
      .unwrap();
    assert.equal(lmapResult("5"), 10, 'Auto fluent lmap');
    
    // Test rmap
    const rmapResult = autoFunction
      .rmap((n: number) => n.toString())
      .unwrap();
    assert.equal(rmapResult(5), "10", 'Auto fluent rmap');
  });

  it('should chain Profunctor operations with other typeclass operations', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const result = new Auto(taggedFunction)
      .lmap((s: string) => parseInt(s))  // string -> number
      .rmap((n: number) => n.toString()) // number -> string
      .unwrap();
    
    assert.equal(result("5"), "10", 'Chained Profunctor operations');
  });

  it('should handle complex Profunctor transformations', () => {
    const taggedFunction: Tagged<any, 'Function'> = { 
      __tag: 'Function', 
      value: (x: { value: number }) => ({ value: x.value * 2 }) 
    };
    
    const result = new Auto(taggedFunction)
      .dimap(
        (s: string) => ({ value: parseInt(s) }),  // string -> { value: number }
        (obj: { value: number }) => obj.value.toString()  // { value: number } -> string
      )
      .unwrap();
    
    assert.equal(result("5"), "10", 'Complex Profunctor transformation');
  });
});
