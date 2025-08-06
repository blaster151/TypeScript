/**
 * Feedback Loop Example
 * 
 * Demonstrates self-referential streams for basic feedback demonstration.
 * Shows how StatefulStream can be used to create feedback loops where
 * the output of one step becomes part of the input for the next step.
 */

import { StatefulStream } from '../../src/stream/core/types';
import { liftStateful, compose, fmap } from '../../src/stream/core/operators';

// ============================================================================
// Feedback Loop Streams
// ============================================================================

/**
 * Create a feedback loop stream that accumulates values
 * The output becomes part of the next input
 */
function createAccumulatorFeedbackLoop(): StatefulStream<number, number, number> {
  return liftStateful((input: number, state: number) => {
    const newState = state + input;
    return [newState, newState];
  });
}

/**
 * Create a feedback loop stream that maintains a running average
 */
function createAverageFeedbackLoop(): StatefulStream<number, { sum: number; count: number }, number> {
  return liftStateful((input: number, state: { sum: number; count: number }) => {
    const newSum = state.sum + input;
    const newCount = state.count + 1;
    const newState = { sum: newSum, count: newCount };
    const average = newSum / newCount;
    return [newState, average];
  });
}

/**
 * Create a feedback loop stream that maintains a sliding window
 */
function createSlidingWindowFeedbackLoop(windowSize: number): StatefulStream<number, number[], number> {
  return liftStateful((input: number, state: number[]) => {
    const newState = [...state, input];
    if (newState.length > windowSize) {
      newState.shift(); // Remove oldest element
    }
    const average = newState.reduce((sum, val) => sum + val, 0) / newState.length;
    return [newState, average];
  });
}

/**
 * Create a feedback loop stream that applies exponential smoothing
 */
function createExponentialSmoothingFeedbackLoop(alpha: number): StatefulStream<number, number, number> {
  return liftStateful((input: number, state: number) => {
    const smoothed = alpha * input + (1 - alpha) * state;
    return [smoothed, smoothed];
  });
}

/**
 * Create a feedback loop stream that tracks min/max values
 */
function createMinMaxFeedbackLoop(): StatefulStream<number, { min: number; max: number }, { min: number; max: number }> {
  return liftStateful((input: number, state: { min: number; max: number }) => {
    const newMin = Math.min(state.min, input);
    const newMax = Math.max(state.max, input);
    const newState = { min: newMin, max: newMax };
    return [newState, newState];
  });
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Run the accumulator feedback loop example
 */
export function runAccumulatorFeedbackExample(): void {
  console.log('=== Accumulator Feedback Loop Example ===');
  
  const accumulator = createAccumulatorFeedbackLoop();
  const inputs = [1, 2, 3, 4, 5];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = accumulator.run(input)(state);
    console.log(`Input: ${input} -> State: ${newState}, Output: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the average feedback loop example
 */
export function runAverageFeedbackExample(): void {
  console.log('=== Average Feedback Loop Example ===');
  
  const average = createAverageFeedbackLoop();
  const inputs = [85, 92, 78, 96, 88];
  let state = { sum: 0, count: 0 };
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = average.run(input)(state);
    console.log(`Input: ${input} -> Running Average: ${output.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the sliding window feedback loop example
 */
export function runSlidingWindowFeedbackExample(): void {
  console.log('=== Sliding Window Feedback Loop Example ===');
  
  const slidingWindow = createSlidingWindowFeedbackLoop(3);
  const inputs = [10, 20, 30, 40, 50, 60, 70, 80];
  let state: number[] = [];
  
  console.log('Inputs:', inputs);
  console.log('Window size: 3');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = slidingWindow.run(input)(state);
    console.log(`Input: ${input} -> Window: [${newState.join(', ')}] -> Average: ${output.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the exponential smoothing feedback loop example
 */
export function runExponentialSmoothingFeedbackExample(): void {
  console.log('=== Exponential Smoothing Feedback Loop Example ===');
  
  const smoothing = createExponentialSmoothingFeedbackLoop(0.3);
  const inputs = [100, 110, 90, 120, 80, 130, 70, 140];
  let state = 100; // Initial smoothed value
  
  console.log('Inputs:', inputs);
  console.log('Alpha: 0.3');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = smoothing.run(input)(state);
    console.log(`Input: ${input} -> Smoothed: ${output.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the min/max feedback loop example
 */
export function runMinMaxFeedbackExample(): void {
  console.log('=== Min/Max Feedback Loop Example ===');
  
  const minMax = createMinMaxFeedbackLoop();
  const inputs = [85, 92, 78, 96, 88, 75, 99, 82];
  let state = { min: Infinity, max: -Infinity };
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = minMax.run(input)(state);
    console.log(`Input: ${input} -> Min: ${output.min}, Max: ${output.max}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run all feedback loop examples
 */
export function runAllFeedbackLoopExamples(): void {
  runAccumulatorFeedbackExample();
  runAverageFeedbackExample();
  runSlidingWindowFeedbackExample();
  runExponentialSmoothingFeedbackExample();
  runMinMaxFeedbackExample();
}

// ============================================================================
// Advanced Feedback Examples
// ============================================================================

/**
 * Create a feedback loop stream that implements a simple PID controller
 */
function createPIDControllerFeedbackLoop(kp: number, ki: number, kd: number, setpoint: number): StatefulStream<number, { integral: number; lastError: number }, number> {
  return liftStateful((input: number, state: { integral: number; lastError: number }) => {
    const error = setpoint - input;
    const integral = state.integral + error;
    const derivative = error - state.lastError;
    
    const output = kp * error + ki * integral + kd * derivative;
    const newState = { integral, lastError: error };
    
    return [newState, output];
  });
}

/**
 * Create a feedback loop stream that implements a moving average with weights
 */
function createWeightedMovingAverageFeedbackLoop(weights: number[]): StatefulStream<number, number[], number> {
  return liftStateful((input: number, state: number[]) => {
    const newState = [...state, input];
    if (newState.length > weights.length) {
      newState.shift();
    }
    
    let weightedSum = 0;
    let weightSum = 0;
    
    for (let i = 0; i < newState.length; i++) {
      const weight = weights[weights.length - newState.length + i];
      weightedSum += newState[i] * weight;
      weightSum += weight;
    }
    
    const weightedAverage = weightedSum / weightSum;
    return [newState, weightedAverage];
  });
}

/**
 * Run the PID controller feedback loop example
 */
export function runPIDControllerFeedbackExample(): void {
  console.log('=== PID Controller Feedback Loop Example ===');
  
  const pidController = createPIDControllerFeedbackLoop(1.0, 0.1, 0.05, 100);
  const inputs = [80, 85, 90, 95, 100, 105, 110, 115, 120];
  let state = { integral: 0, lastError: 0 };
  
  console.log('Inputs:', inputs);
  console.log('Setpoint: 100');
  console.log('Kp: 1.0, Ki: 0.1, Kd: 0.05');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = pidController.run(input)(state);
    console.log(`Input: ${input} -> Error: ${(100 - input).toFixed(2)} -> Control Output: ${output.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the weighted moving average feedback loop example
 */
export function runWeightedMovingAverageFeedbackExample(): void {
  console.log('=== Weighted Moving Average Feedback Loop Example ===');
  
  const weights = [0.1, 0.2, 0.3, 0.4]; // More weight to recent values
  const weightedAverage = createWeightedMovingAverageFeedbackLoop(weights);
  const inputs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  let state: number[] = [];
  
  console.log('Inputs:', inputs);
  console.log('Weights:', weights);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = weightedAverage.run(input)(state);
    console.log(`Input: ${input} -> Weighted Average: ${output.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Create a feedback loop stream that implements a simple state machine
 */
function createStateMachineFeedbackLoop<State, Input, Output>(
  initialState: State,
  transition: (state: State, input: Input) => [State, Output]
): StatefulStream<Input, State, Output> {
  return liftStateful((input: Input, state: State) => {
    return transition(state, input);
  });
}

/**
 * Run the state machine feedback loop example
 */
export function runStateMachineFeedbackExample(): void {
  console.log('=== State Machine Feedback Loop Example ===');
  
  // Simple traffic light state machine
  type TrafficLightState = 'red' | 'yellow' | 'green';
  type TrafficInput = 'tick';
  
  const trafficLight = createStateMachineFeedbackLoop<TrafficLightState, TrafficInput, TrafficLightState>(
    'red',
    (state, input) => {
      switch (state) {
        case 'red':
          return ['green', 'green'];
        case 'green':
          return ['yellow', 'yellow'];
        case 'yellow':
          return ['red', 'red'];
      }
    }
  );
  
  const inputs: TrafficInput[] = ['tick', 'tick', 'tick', 'tick', 'tick', 'tick'];
  let state: TrafficLightState = 'red';
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = trafficLight.run(input)(state);
    console.log(`Input: ${input} -> State: ${newState} -> Output: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

// Export utility functions
export {
  createAccumulatorFeedbackLoop,
  createAverageFeedbackLoop,
  createSlidingWindowFeedbackLoop,
  createExponentialSmoothingFeedbackLoop,
  createMinMaxFeedbackLoop,
  createPIDControllerFeedbackLoop,
  createWeightedMovingAverageFeedbackLoop,
  createStateMachineFeedbackLoop
}; 