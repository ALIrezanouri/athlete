/**
 * Server Action Timing Wrapper
 *
 * Usage:
 *   export const getItems = withTiming("getItems", async () => { ... });
 *
 * Logs:
 *   [PERF] getItems completed in 142ms
 *   [PERF SLOW] getItems took 2340ms (threshold: 2000ms)
 *   [PERF ERROR] getItems failed after 520ms — Error: ...
 */

import { performance } from "perf_hooks";

const SLOW_THRESHOLD_MS = 2000;

type AsyncFn<T> = (...args: unknown[]) => Promise<T>;

export function withTiming<T>(name: string, fn: AsyncFn<T>): AsyncFn<T> {
  return async (...args: unknown[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = Math.round(performance.now() - start);

      if (duration > SLOW_THRESHOLD_MS) {
        console.warn(`[PERF SLOW] ${name} took ${duration}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`);
      } else {
        console.log(`[PERF] ${name} completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      console.error(`[PERF ERROR] ${name} failed after ${duration}ms — ${error}`);
      throw error;
    }
  };
}