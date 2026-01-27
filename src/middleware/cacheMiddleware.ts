import * as Sentry from '@sentry/cloudflare';
import type { Middleware } from './middleware';

/**
 * Caches the response of a {@link Middleware} given that,
 *  1. Caching is enabled
 *  2. The middleware's next() callback wasn't called (we only want to cache
 *      responses for this specific middleware)
 *  3. The response is successful (HTTP 200)
 *
 * Don't use this for non-GET requests (not enforced progammatically here but
 *  workerd will throw an error if it's called for anything other than GET).
 *
 * Cloudflare's cache api respects the cache-control header set in the response
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/cache/
 *
 * @param middleware Middleware to cache the response of
 */
export function cached(middleware: Middleware): Middleware {
  // Cache specifically for this middleware
  let cache: Cache;

  const wrapper: Middleware = {
    async handle(request, ctx) {
      Sentry.addBreadcrumb({
        category: 'CacheMiddleware',
        data: {
          underlyingMiddleware: middleware.constructor.name,
        },
      });

      // Caching globally disabled, skip
      if (!ctx.env.CACHING) {
        return middleware.handle(request, ctx);
      }

      cache ??= await caches.open(middleware.constructor.name);

      // Check if the request is in the cache already, return it if so
      let response = await cache.match(request);
      if (response !== undefined) {
        return response;
      }

      response = await middleware.handle(request, ctx);

      if (response instanceof Response && response.status === 200) {
        // Successful request, let's cache it for next time
        const cachedResponse = response.clone();

        ctx.execution.waitUntil(cache.put(request, cachedResponse));
      }

      return response;
    },
  };

  return wrapper;
}
