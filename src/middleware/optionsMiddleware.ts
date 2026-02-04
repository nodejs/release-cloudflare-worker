import * as Sentry from '@sentry/cloudflare';
import { CACHE_HEADERS } from '../constants/cache';
import type { Middleware } from './middleware';

/**
 * Handles OPTION requests, just returns what HTTP methods we support
 */
export class OptionsMiddleware implements Middleware {
  handle(_: Request): Promise<Response> {
    Sentry.addBreadcrumb({
      category: 'OptionsMiddleware',
      message: 'hit',
    });

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
