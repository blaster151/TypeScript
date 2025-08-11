/**
 * Centralized interop between effect types (IO, Task, etc.)
 *
 * Policy:
 * - IO -> Task is SAFE (wrap in Promise).
 * - Task -> IO is NOT SAFE in the general case (requires blocking). We expose
 *   unsafeTaskToIO which throws by default, to avoid accidental misuse.
 */

// If concrete IO/Task modules exist, import their types here.
// Otherwise we use simple fallback shapes that match our usage sites.

export type FallbackIO<A> = () => A;
export type FallbackTask<A> = () => Promise<A>;

// Using fallbacks to keep this module decoupled
export type IOType<A> = FallbackIO<A>;
export type TaskType<A> = FallbackTask<A>;

/** Safe: IO -> Task (lift to async) */
export const ioToTask = <A>(io: IOType<A>): TaskType<A> => {
  return (async () => io()) as TaskType<A>;
};

/**
 * Unsafe: Task -> IO
 * There is no safe, general, synchronous way to convert async to sync.
 * This throws by default to make hazards explicit.
 */
export const unsafeTaskToIO = <A>(
  _task: TaskType<A>,
  _opts?: { assumeResolved?: boolean }
): IOType<A> => {
  return (() => {
    throw new Error(
      'unsafeTaskToIO: cannot safely convert async Task to synchronous IO. ' +
      'Use ioToTask to lift IO, or keep pipelines async.'
    );
  }) as IOType<A>;
};

export const liftIO = ioToTask;
export const unsafeLowerTask = unsafeTaskToIO;


