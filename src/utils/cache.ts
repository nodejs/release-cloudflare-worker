import { Env } from '../env';

/**
 * @param env Worker env
 * @returns True if we want to either cache files or
 *  directory listings
 */
export function isCacheEnabled(env: Env): boolean {
  return env.ENVIRONMENT !== 'e2e-tests';
}
