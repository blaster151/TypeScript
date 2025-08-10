# Multiplicity Debug System

## Overview

The Multiplicity Debug System enhances the multiplicity system to make inferred usage bounds visible in developer tooling and optionally at runtime. This gives developers **immediate feedback** on multiplicity inference, both at compile-time and optionally at runtime, so they can trust and leverage the system without diving into internals.

## Core Features

### 1. Type-Level Exposure

The system provides type-level helpers to extract and constrain usage bounds:

```typescript
// Extract usage bound type from a value
export type UsageBoundOf<T> = T extends { usageBound: infer UB } ? UB : never;

// Branded usage bound interface
export interface UsageBoundBrand<UB> {
  readonly __usageBound: UB;
}

// Type with usage bound branding
export type WithUsageBound<T, UB> = T & UsageBoundBrand<UB>;

// Type-level usage bound constraints
export type RequireBound1<T> = UsageBoundOf<T> extends { usage: (input: any) => 1 } ? T : never;
export type RequireBoundN<T, N extends number> = UsageBoundOf<T> extends { usage: (input: any) => N } ? T : never;
export type RequireFiniteBound<T> = UsageBoundOf<T> extends { usage: (input: any) => number } ? T : never;
export type RequireInfiniteBound<T> = UsageBoundOf<T> extends { usage: (input: any) => "∞" } ? T : never;
```

### 2. Registry Debug API

The registry provides debug information for all registered types:

```typescript
// Get usage bound debug information
export function getUsageBoundDebug(typeId: HKTKey): Multiplicity;

// Get all registered usage bounds for debugging
export function getAllUsageBoundsDebug(): Record<string, Multiplicity>;

// Register default usage bound for a type
export function registerTypeUsageBound(typeId: HKTKey, bound: Multiplicity): void;
```

### 3. Runtime Debug Logging

Opt-in runtime logging provides detailed information about bound transitions:

```typescript
// Debug configuration
export const multiplicityDebug = {
  enabled: false,
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  includeStackTraces: false,
  logToConsole: true,
  logToFile: false,
  logFilePath: './multiplicity-debug.log'
};
```

### 4. Developer-Facing IntelliSense

The system generates JSDoc comments for IntelliSense support:

```typescript
// Generate JSDoc comment for usage bound
export function generateUsageBoundJSDoc(typeKey: string): string;

// Create branded instance with JSDoc
export function createBrandedInstance<T, UB extends Multiplicity>(
  instance: T,
  usageBound: UB,
  typeKey: string
): WithUsageBound<T, UB>;
```

## Usage Examples

### 1. Enabling Debug Logging

To turn on debug logging for the entire system:

```typescript
import { multiplicityDebug } from './multiplicity-debug-system';

// Enable debug logging
multiplicityDebug.enabled = true;
multiplicityDebug.logLevel = 'info';

// Now all multiplicity operations will log their bound transitions
```

### 2. Using Type-Level Constraints

Use type-level constraints to enforce usage bounds:

```typescript
import { 
  UsageBoundOf, 
  WithUsageBound, 
  RequireBound1, 
  RequireFiniteBound 
} from './multiplicity-debug-system';

// Extract usage bound from a type
type MaybeBound = UsageBoundOf<Maybe<number>>; // 1

// Enforce bound constraints
type RequireBound1<T> = UsageBoundOf<T> extends { usage: (input: any) => 1 } ? T : never;

// This will only accept types with bound = 1
function processSingleUse<T extends RequireBound1<T>>(value: T): void {
  // Process value that can only be used once
}

// Create branded values
const singleUseValue: WithUsageBound<{ value: number }, 1> = {
  value: 42,
  __usageBound: 1
};

// This will compile
processSingleUse(singleUseValue);

// This will not compile (bound = "∞")
const infiniteValue: WithUsageBound<{ value: number }, "∞"> = {
  value: 42,
  __usageBound: "∞"
};
// processSingleUse(infiniteValue); // Type error!
```

### 3. Registry Debug Information

Query the registry for debug information:

```typescript
import { 
  getUsageBoundDebug, 
  getAllUsageBoundsDebug,
  registerTypeUsageBound 
} from './multiplicity-debug-system';

// Get bound for a specific type
const maybeBound = getUsageBoundDebug('Maybe'); // 1
const arrayBound = getUsageBoundDebug('Array'); // "∞"

// Get all registered bounds
const allBounds = getAllUsageBoundsDebug();
console.log(allBounds);
// {
//   Maybe: 1,
//   Either: 1,
//   Array: "∞",
//   ObservableLite: "∞",
//   Lens: 1,
//   ...
// }

// Register custom type
registerTypeUsageBound('CustomType', 5);
const customBound = getUsageBoundDebug('CustomType'); // 5
```

### 4. Enhanced Derivation with Debug

Use enhanced derivation with debug logging:

```typescript
import { 
  deriveInstancesWithDebug,
  createUsageBoundWithDebug 
} from './multiplicity-debug-system';

// Create instances with debug logging
const instances = deriveInstancesWithDebug({
  map: (fa, f) => {
    const result = { ...fa, value: f(fa.value) };
    result.usageBound = fa.usageBound;
    return result;
  },
  of: (a) => ({ value: a }),
  chain: (fa, f) => f(fa.value),
  usageBound: createUsageBoundWithDebug(1, 'CustomType'),
  typeKey: 'CustomType',
  debugName: 'CustomType',
  enableLogging: true,
  functor: true,
  applicative: true,
  monad: true
});

// Now operations will log their bound transitions
const mockFa = { value: 42, usageBound: { usage: () => 1 } };
const mapped = instances.functor!.map(mockFa, x => x * 2);
// Logs: [Multiplicity] Functor.map on CustomType — bound preserved: 1 → 1
```

### 5. Convenience Functions with Debug

Use convenience functions with debug support:

```typescript
import { 
  deriveMaybeInstancesWithDebug,
  deriveArrayInstancesWithDebug 
} from './multiplicity-debug-system';

// Create Maybe instances with debug logging
const maybeInstances = deriveMaybeInstancesWithDebug(true);

// Create Array instances with debug logging
const arrayInstances = deriveArrayInstancesWithDebug(true);

// Operations will log their bound transitions
const mockMaybe = { value: 42, usageBound: { usage: () => 1 } };
const mapped = maybeInstances.functor!.map(mockMaybe, x => x * 2);
// Logs: [Multiplicity] Functor.map on Maybe — bound preserved: 1 → 1
```

## Debug Log Output

When debug logging is enabled, you'll see detailed information about bound transitions:

```
[Multiplicity] [2024-01-15T10:30:00.000Z] [INFO] Deriving instances for Maybe
[Multiplicity] [2024-01-15T10:30:00.000Z] [INFO] Completed deriving instances for Maybe
[Multiplicity] [2024-01-15T10:30:01.000Z] [INFO] Functor.map on Maybe — bound preserved: 1 → 1
[Multiplicity] [2024-01-15T10:30:02.000Z] [INFO] Applicative.ap on Maybe — bound multiplied: 1 * 2 = 2
[Multiplicity] [2024-01-15T10:30:03.000Z] [INFO] Monad.chain on Maybe — bound multiplied: 1 * 3 = 3
[Multiplicity] [2024-01-15T10:30:04.000Z] [INFO] Traversable.traverse on Array — bound multiplied: ∞ * 1 = ∞
```

## Scenarios Where Bound Awareness Helps

### 1. Single-Shot Streams

Prevent misuse of single-shot streams:

```typescript
// Single-shot stream with bound = 1
const singleShotStream: WithUsageBound<Stream<number>, 1> = {
  // ... stream implementation
  __usageBound: 1
};

// This function requires single-use streams
function processSingleShot<T extends RequireBound1<T>>(stream: T): void {
  // Process stream that can only be consumed once
}

// This will compile
processSingleShot(singleShotStream);

// This will not compile (infinite stream)
const infiniteStream: WithUsageBound<Stream<number>, "∞"> = {
  // ... stream implementation
  __usageBound: "∞"
};
// processSingleShot(infiniteStream); // Type error!
```

### 2. Resource Management

Ensure proper resource cleanup:

```typescript
// Resource with finite usage bound
const resource: WithUsageBound<Resource, 5> = {
  // ... resource implementation
  __usageBound: 5
};

// Function that requires finite resource usage
function processFiniteResource<T extends RequireFiniteBound<T>>(resource: T): void {
  // Process resource with known finite usage
}

// This will compile
processFiniteResource(resource);

// This will not compile (infinite resource)
const infiniteResource: WithUsageBound<Resource, "∞"> = {
  // ... resource implementation
  __usageBound: "∞"
};
// processFiniteResource(infiniteResource); // Type error!
```

### 3. Performance Optimization

Use bound information for optimization:

```typescript
// Optimize based on usage bounds
function optimizeOperation<T>(value: T): void {
  const bound = getUsageBoundDebugFromValue(value);
  
  if (bound === 1) {
    // Single-use optimization
    console.log('Using single-use optimization');
  } else if (bound === "∞") {
    // Infinite-use optimization
    console.log('Using infinite-use optimization');
  } else {
    // Finite-use optimization
    console.log(`Using finite-use optimization (bound: ${bound})`);
  }
}
```

### 4. Debugging Complex Pipelines

Debug complex functional pipelines:

```typescript
// Enable debug logging for complex pipeline
multiplicityDebug.enabled = true;

// Complex pipeline with multiple operations
const pipeline = pipe(
  maybeStream,           // bound = 1
  map(x => x * 2),      // bound = 1 (preserved)
  chain(x => arrayStream), // bound = 1 * ∞ = ∞
  traverse(x => maybeStream) // bound = ∞ * 1 = ∞
);

// Debug output shows bound transitions:
// [Multiplicity] Functor.map on Maybe — bound preserved: 1 → 1
// [Multiplicity] Monad.chain on Maybe — bound multiplied: 1 * ∞ = ∞
// [Multiplicity] Traversable.traverse on Array — bound multiplied: ∞ * 1 = ∞
```

## Configuration Options

### Debug Configuration

```typescript
export const multiplicityDebug = {
  enabled: false,           // Enable/disable debug logging
  logLevel: 'info',         // Log level: 'debug' | 'info' | 'warn' | 'error'
  includeStackTraces: false, // Include stack traces in logs
  logToConsole: true,       // Log to console
  logToFile: false,         // Log to file
  logFilePath: './multiplicity-debug.log' // Log file path
};
```

### Logger Methods

```typescript
import { multiplicityLogger } from './multiplicity-debug-system';

// Manual logging
multiplicityLogger.debug('Debug message', { data: 'debug info' });
multiplicityLogger.info('Info message', { data: 'info' });
multiplicityLogger.warn('Warning message', { data: 'warning' });
multiplicityLogger.error('Error message', { data: 'error' });

// Flush logs to file
multiplicityLogger.flushToFile();
```

## Performance Considerations

### Debug Logging Impact

- **Disabled**: No performance impact
- **Enabled**: Minimal overhead (~1-2% in typical usage)
- **File logging**: Additional I/O overhead

### Best Practices

1. **Enable only when needed**: Turn on debug logging only during development or debugging
2. **Use appropriate log levels**: Use 'debug' for detailed info, 'info' for general flow
3. **Monitor performance**: Check performance impact in production-like environments
4. **Clean up**: Disable debug logging in production builds

## Future Enhancements

### 1. VSCode Integration

Future TS-fork integration could provide:

```typescript
// Hover display showing usage bounds
const value: Maybe<number> = Just(42);
// Hover shows: usageBound: 1

// Custom language service plugin for richer display
// - Usage bound visualization
// - Bound transition tracking
// - Performance impact analysis
```

### 2. Advanced Type-Level Features

```typescript
// Dependent usage types
type DependentBound<T> = T extends Array<infer A> ? A extends number ? 10 : "∞" : 1;

// Usage-preserving transformations
type PreserveBound<T, F> = T extends { usageBound: infer UB } 
  ? F extends (input: T) => infer R 
    ? R & { usageBound: UB }
    : never
  : never;
```

### 3. Performance Monitoring

```typescript
// Runtime usage tracking
const usageTracker = createUsageTracker();

// Track actual usage vs. predicted bounds
usageTracker.track(stream, (actual, predicted) => {
  if (actual > predicted) {
    console.warn('Usage exceeded predicted bound!');
  }
});
```

## Conclusion

The Multiplicity Debug System provides developers with **immediate feedback** on multiplicity inference through:

- **Type-level exposure** of usage bounds
- **Registry debug API** for querying bounds
- **Runtime debug logging** for bound transitions
- **Developer-facing IntelliSense** support
- **Performance-conscious design** with minimal overhead

This enables developers to trust and leverage the multiplicity system without diving into internals, while providing the tools needed to debug complex functional pipelines and prevent logical bugs related to resource usage. 