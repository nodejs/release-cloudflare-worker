import type { Toucan } from 'toucan-js';

/**
 * Utility for retrying request sent to a provider's data source
 * @param request Function that performs the request
 * @returns Result returned from {@link request}
 */
export async function retryWrapper<T>(
  request: () => Promise<T>,
  retryLimit: number,
  sentry?: Toucan
): Promise<T> {
  let r2Error: unknown = undefined;
  for (let i = 0; i < retryLimit; i++) {
    try {
      const result = await request();
      return result;
    } catch (err) {
      r2Error = err;
    }
  }

  if (sentry !== undefined) {
    sentry.captureException(r2Error);
  }

  throw r2Error;
}
