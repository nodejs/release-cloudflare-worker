/**
 * For running something once
 * @example
 * const getProvider = once((ctx) => new R2Provider({ ctx }));
 * // later...
 * getProvider(ctx).something();
 */
export function once<T, Args extends Array<I>, I = unknown>(
  fn: (...args: Args) => T
): (...args: Args) => T {
  let value: T;
  let hasBeenCalled = false;

  return (...args: Args) => {
    if (hasBeenCalled) {
      return value;
    }

    hasBeenCalled = true;
    value = fn(...args);

    return value;
  };
}
