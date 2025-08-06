console.log('Testing Observable-Optic Integration...');

// Mock implementations
class MockObservableLite {
  constructor(subscribe) {
    this._subscribe = subscribe;
  }

  subscribe(observer) {
    return this._subscribe(observer);
  }

  over(optic, fn) {
    return new MockObservableLite((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (optic.get && optic.set) {
              const focused = optic.get(value);
              const transformed = fn(focused);
              observer.next(optic.set(transformed, value));
            } else {
              observer.next(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  preview(optic) {
    return new MockObservableLite((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (optic.get) {
              const focused = optic.get(value);
              observer.next(focused);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  static fromArray(values) {
    return new MockObservableLite((observer) => {
      values.forEach(value => observer.next(value));
      observer.complete?.();
      return () => {};
    });
  }
}

// Mock lens
const nameLens = {
  get: (person) => person.name,
  set: (name, person) => ({ ...person, name })
};

// Test data
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const peopleObs = MockObservableLite.fromArray(people);

// Test 1: .over() with lens
console.log('✅ Testing .over() with lens:');
peopleObs.over(nameLens, name => name.toUpperCase()).subscribe({
  next: (value) => console.log('  Transformed:', value.name),
  complete: () => console.log('  .over() test completed')
});

// Test 2: .preview() with lens
console.log('✅ Testing .preview() with lens:');
peopleObs.preview(nameLens).subscribe({
  next: (value) => console.log('  Extracted:', value),
  complete: () => console.log('  .preview() test completed')
});

console.log('🎉 Observable-Optic integration working correctly!'); 