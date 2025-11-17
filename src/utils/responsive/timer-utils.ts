/**
 * Timer utilities for cross-environment compatibility
 * Provides stable timer handling for both browser and test environments
 */

export interface TimerHandle {
  id: number | NodeJS.Timeout;
  clear: () => void;
}

/**
 * Create a timer that works consistently across different environments
 * @param callback Function to execute after delay
 * @param ms Delay in milliseconds
 * @returns TimerHandle with clear method
 */
export const createTimer = (callback: () => void, ms: number): TimerHandle => {
  const id = setTimeout(callback, ms);
  return {
    id,
    clear: () => clearTimeout(id as NodeJS.Timeout),
  };
};
