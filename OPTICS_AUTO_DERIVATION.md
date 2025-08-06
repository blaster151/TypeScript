# Automatic Optics Derivation System

## 🎉 Overview

The Automatic Optics Derivation System provides automatic generation of lenses, prisms, isos, and traversals for all ADTs in the registry, with full integration with the profunctor-powered optics system.

## 🚀 Quickstart

### Basic Optics Access

```typescript
import { getADTOptics, initializeOptics } from './fp-optics-auto-derivation';

// Initialize optics for all ADTs
initializeOptics();

// Get optics for a specific ADT
const maybeOptics = getADTOptics('Maybe');
const eitherOptics = getADTOptics('Either');

// Use generated optics
const just = { tag: 'Just', payload: { value: 42 } };

// Constructor prism
const justPreview = maybeOptics.Just.preview(just);
console.log(justPreview); // { tag: 'Just', payload: { value: 42 } }

// Field lens
const value = maybeOptics.value.view(just);
console.log(value); // 42

const updated = maybeOptics.value.set(100, just);
console.log(updated.payload.value); // 100
```

### Registry Integration

```typescript
import { getOpticsRegistry } from './fp-optics-auto-derivation';

const registry = getOpticsRegistry();
const personOptics = registry.getOptics('Person');

// Access optics through registry
const nameLens = personOptics.name;
const ageLens = personOptics.age;

const person = { tag: 'Person', payload: { name: 'Alice', age: 30 } };
console.log(nameLens.view(person)); // "Alice"
console.log(ageLens.view(person)); // 30
```

## 📚 Complete API Reference

### Core Functions

#### `initializeOptics()`
Initializes optics for all ADTs in the registry.

#### `getADTOptics(adtName: string): ADTOptics | undefined`
Gets the generated optics for a specific ADT.

#### `getADTOpticsMetadata(adtName: string): OpticsMetadata[] | undefined`
Gets metadata for all optics of a specific ADT.

#### `getOpticsRegistry(): OpticsRegistry`
Gets the global optics registry.

### Types

#### `ADTOptics`
```typescript
interface ADTOptics {
  // Constructor prisms
  [constructor: string]: Prism<any, any, any, any>;
  
  // Field lenses
  [field: string]: Lens<any, any, any, any>;
  
  // Collection traversals
  [collection: string]: Traversal<any, any, any, any>;
  
  // Utility methods
  constructor: (name: string) => Prism<any, any, any, any>;
  field: (name: string) => Lens<any, any, any, any>;
  collection: (name: string) => Traversal<any, any, any, any>;
  compose: (...optics: any[]) => any;
}
```

#### `OpticsMetadata`
```typescript
interface OpticsMetadata {
  name: string;
  adtName: string;
  opticType: 'Lens' | 'Prism' | 'Iso' | 'Traversal' | 'Optional';
  sourceType: string;
  targetType: string;
  typeParameters: string[];
  constructor?: string;
  field?: string;
  isCollection?: boolean;
  optic: any;
}
```

## 🎯 Usage Examples

### 1. Maybe Optics

```typescript
const maybeOptics = getADTOptics('Maybe');

const just = { tag: 'Just', payload: { value: 42 } };
const nothing = { tag: 'Nothing', payload: {} };

// Constructor prisms
const justPreview = maybeOptics.Just.preview(just);
console.log(justPreview.tag); // "Just"
console.log(justPreview.payload.value); // 42

const nothingPreview = maybeOptics.Nothing.preview(nothing);
console.log(nothingPreview.tag); // "Just"

// Field lens
const valueLens = maybeOptics.value;
const value = valueLens.view(just);
console.log(value); // 42

const updated = valueLens.set(100, just);
console.log(updated.payload.value); // 100

// Collection traversal
const elementsTraversal = maybeOptics.elements;
const doubled = elementsTraversal.over(x => x * 2, just);
console.log(doubled.payload.value); // 84
```

### 2. Either Optics

```typescript
const eitherOptics = getADTOptics('Either');

const left = { tag: 'Left', payload: { value: 'error' } };
const right = { tag: 'Right', payload: { value: 42 } };

// Constructor prisms
const leftPreview = eitherOptics.Left.preview(left);
console.log(leftPreview.payload.value); // "error"

const rightPreview = eitherOptics.Right.preview(right);
console.log(rightPreview.payload.value); // 42

// Field lens
const valueLens = eitherOptics.value;
const leftValue = valueLens.view(left);
console.log(leftValue); // "error"

const rightValue = valueLens.view(right);
console.log(rightValue); // 42

// Review (construct)
const newLeft = eitherOptics.Left.review({ value: 'new error' });
console.log(newLeft.tag); // "Left"
```

### 3. List Optics

```typescript
const listOptics = getADTOptics('List');

const list = {
  tag: 'Cons',
  payload: {
    head: 1,
    tail: {
      tag: 'Cons',
      payload: {
        head: 2,
        tail: { tag: 'Nil', payload: {} }
      }
    }
  }
};

// Constructor prisms
const consPreview = listOptics.Cons.preview(list);
console.log(consPreview.payload.head); // 1

// Field lenses
const headLens = listOptics.head;
const tailLens = listOptics.tail;

const head = headLens.view(list);
console.log(head); // 1

const tail = tailLens.view(list);
console.log(tail.tag); // "Cons"

// Collection traversal
const elementsTraversal = listOptics.elements;
const doubled = elementsTraversal.over(x => x * 2, list);
console.log(doubled.payload.head); // 2
```

### 4. Product Type Optics

```typescript
const personOptics = getADTOptics('Person');

const person = {
  tag: 'Person',
  payload: {
    name: 'Alice',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown'
    }
  }
};

// Field lenses
const nameLens = personOptics.name;
const ageLens = personOptics.age;
const addressLens = personOptics.address;

const name = nameLens.view(person);
console.log(name); // "Alice"

const age = ageLens.view(person);
console.log(age); // 30

const address = addressLens.view(person);
console.log(address.street); // "123 Main St"

// Update fields
const updatedPerson = nameLens.set('Bob', person);
console.log(updatedPerson.payload.name); // "Bob"
```

### 5. Optics Composition

```typescript
const personOptics = getADTOptics('Person');
const addressOptics = getADTOptics('Address');

const person = {
  tag: 'Person',
  payload: {
    name: 'Alice',
    address: {
      tag: 'Address',
      payload: {
        street: '123 Main St',
        city: 'Anytown'
      }
    }
  }
};

// Compose optics
const streetLens = personOptics.address.then(addressOptics.street);
const cityLens = personOptics.address.then(addressOptics.city);

const street = streetLens.view(person);
console.log(street); // "123 Main St"

const city = cityLens.view(person);
console.log(city); // "Anytown"

// Update nested fields
const updatedPerson = streetLens.set('456 Oak Ave', person);
console.log(updatedPerson.payload.address.payload.street); // "456 Oak Ave"
```

## 🔧 Advanced Features

### Custom Optics Generation

```typescript
import { generateConstructorPrism, generateFieldLens } from './fp-optics-auto-derivation';

// Generate custom optics
const customPrism = generateConstructorPrism('CustomADT', 'CustomCase', {
  constructors: ['CustomCase'],
  fieldTypes: { CustomCase: ['value'] }
});

const customLens = generateFieldLens('CustomADT', 'CustomCase', 'value', 0, {
  constructors: ['CustomCase'],
  fieldTypes: { CustomCase: ['value'] }
});
```

### Enhanced Optics

```typescript
import { enhancedOptic } from './fp-optics-auto-derivation';

const maybeOptics = getADTOptics('Maybe');
const enhancedValueLens = enhancedOptic(maybeOptics.value);

// Enhanced methods
const just = { tag: 'Just', payload: { value: 42 } };

const value = enhancedValueLens.get(just);
console.log(value); // 42

const updated = enhancedValueLens.set(100, just);
console.log(updated.payload.value); // 100

const modified = enhancedValueLens.modify(x => x * 2, just);
console.log(modified.payload.value); // 84

// Composition
const composed = enhancedValueLens.then(enhancedOptic(maybeOptics.value));
```

### Registry Metadata Access

```typescript
import { getADTOpticsMetadata } from './fp-optics-auto-derivation';

const metadata = getADTOpticsMetadata('Maybe');

console.log('Optics metadata:');
metadata.forEach(meta => {
  console.log(`- ${meta.name}: ${meta.opticType}`);
  console.log(`  Source: ${meta.sourceType} -> Target: ${meta.targetType}`);
  if (meta.constructor) {
    console.log(`  Constructor: ${meta.constructor}`);
  }
  if (meta.field) {
    console.log(`  Field: ${meta.field}`);
  }
});
```

## 🧪 Testing

### Law Compliance Tests

```typescript
// Lens Laws
function testLensLaws(lens, source, value) {
  // Law 1: view (set s a) = a
  const setResult = lens.set(value, source);
  const viewResult = lens.view(setResult);
  assert(viewResult === value, 'Lens Law 1 failed');
  
  // Law 2: set (set s a) b = set s b
  const set1 = lens.set(value, source);
  const set2 = lens.set(value + 1, set1);
  const setDirect = lens.set(value + 1, source);
  assert(JSON.stringify(set2) === JSON.stringify(setDirect), 'Lens Law 2 failed');
  
  // Law 3: set s (view s) = s
  const viewS = lens.view(source);
  const setViewS = lens.set(viewS, source);
  assert(JSON.stringify(setViewS) === JSON.stringify(source), 'Lens Law 3 failed');
}

// Prism Laws
function testPrismLaws(prism, source, value) {
  // Law 1: preview s >>= review = Just s
  const previewResult = prism.preview(source);
  if (previewResult.tag === 'Just') {
    const reviewResult = prism.review(previewResult.payload);
    assert(JSON.stringify(reviewResult) === JSON.stringify(source), 'Prism Law 1 failed');
  }
  
  // Law 2: review a >>= preview = Just a
  const reviewA = prism.review(value);
  const previewReview = prism.preview(reviewA);
  if (previewReview.tag === 'Just') {
    assert(previewReview.payload === value, 'Prism Law 2 failed');
  }
}
```

### Integration Tests

```typescript
// Test optics generation for all ADTs
function testAllADTOptics() {
  const registry = getOpticsRegistry();
  const adtNames = ['Maybe', 'Either', 'Result', 'List', 'Tree'];
  
  for (const adtName of adtNames) {
    const optics = registry.getOptics(adtName);
    assert(optics !== undefined, `Optics not found for ${adtName}`);
    
    const metadata = registry.getOpticsMetadata(adtName);
    assert(metadata !== undefined, `Metadata not found for ${adtName}`);
    assert(metadata.length > 0, `No optics metadata for ${adtName}`);
    
    console.log(`✅ ${adtName}: ${metadata.length} optics generated`);
  }
}
```

## 📊 Optics Types Generated

| ADT Type | Prisms | Lenses | Traversals | Isos |
|----------|--------|--------|------------|------|
| **Maybe** | Just, Nothing | value | elements | - |
| **Either** | Left, Right | value | elements | - |
| **Result** | Ok, Err | value, error | elements | - |
| **List** | Cons, Nil | head, tail | elements | - |
| **Tree** | Leaf, Node | value, left, right | elements | - |
| **Product Types** | - | all fields | - | - |
| **Collections** | - | - | elements | - |

## 🎯 Benefits

### 1. **Automatic Generation**
- No manual optics implementation required
- Consistent optics across all ADTs
- Automatic updates when ADT structure changes

### 2. **Type Safety**
- Full TypeScript support
- Proper generic inference
- Type-safe composition

### 3. **Performance**
- Efficient optics generation
- Minimal runtime overhead
- Optimized registry lookups

### 4. **Integration**
- Seamless registry integration
- Works with existing profunctor optics
- Automatic metadata storage

### 5. **Composability**
- Full composition support
- Chainable optics
- Enhanced optics with utility methods

## 🔄 Migration Guide

### From Manual Optics

**Before:**
```typescript
// Manual optics definition
const maybeJustPrism = prism(
  (instance) => instance.tag === 'Just' ? { left: instance.payload, right: instance } : { left: instance, right: instance },
  (payload) => ({ tag: 'Just', payload })
);

const maybeValueLens = lens(
  (instance) => instance.payload.value,
  (instance, value) => ({ ...instance, payload: { ...instance.payload, value } })
);
```

**After:**
```typescript
// Automatic optics
const maybeOptics = getADTOptics('Maybe');
const justPrism = maybeOptics.Just;
const valueLens = maybeOptics.value;
```

## 🎉 Conclusion

The Automatic Optics Derivation System provides a powerful, type-safe, and efficient way to generate optics for all ADTs in the registry. With automatic generation, full composition support, and seamless integration, you get:

- ✅ Automatic Prism generation for constructors
- ✅ Automatic Lens generation for fields
- ✅ Automatic Traversal generation for collections
- ✅ Full composition support
- ✅ Law-compliant implementations
- ✅ Registry integration
- ✅ Type safety and performance

Start using automatic optics derivation today to simplify your optics usage and unlock the full power of functional programming optics! 