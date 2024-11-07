import { CACHE_HEADERS } from '../constants/cache';
import { Context } from '../context';
import type { Middleware } from './middleware';

/**
 * Handles OPTION requests, just returns what HTTP methods we support
 */
export class OptionsMiddleware implements Middleware {
  handle(_: Request, ctx: Context): Promise<Response> {
    ctx.sentry.addBreadcrumb({
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
