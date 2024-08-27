import { CACHE_HEADERS } from '../constants/cache';
import type { Middleware } from './middleware';

/**
 * Handles OPTION requests, just returns what HTTP methods we support
 */
export class OptionsMiddleware implements Middleware {
  handle(): Promise<Response> {
    return Promise.resolve(
      new Response(undefined, {
        headers: {
          allow: 'GET, HEAD, POST, OPTIONS',
          'cache-control': CACHE_HEADERS.failure,
        },
      })
    );
  }
}
