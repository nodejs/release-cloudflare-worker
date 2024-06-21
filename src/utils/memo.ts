/**
 * For running something once
 * @example
 * const getProvider = once((ctx) => new R2Provider({ ctx }));
 * // later...
 * getProvider(ctx).something();
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function once<T, Args extends Array<any>>(
  fn: (...args: Args) => T
): (...args: Args) => T {
  let value: T;
  return (...args: Args) => {
    if (value === undefined) {
      value = fn(...args);
    }
    return value;
  };
}
