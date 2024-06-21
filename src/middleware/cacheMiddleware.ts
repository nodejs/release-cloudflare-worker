import { isCacheEnabled } from '../utils/cache';
import { Middleware } from './middleware';

/**
 * Caches the response of a {@link Middleware} given that,
 *  1. Caching is enabled
 *  2. The middleware's next() callback wasn't called (we only want to cache
 *      responses for this specific middleware)
 *  3. The response is successful (HTTP 200)
 *
 * Don't use this for non-GET requests
 */
export function cached(middleware: Middleware): Middleware {
  // Cache specifically for this middleware
  let cache: Cache;

  const wrapper: Middleware = {
    async handle(request, ctx, next) {
      if (!isCacheEnabled(ctx.env)) {
        return middleware.handle(request, ctx, next);
      }

      if (cache === undefined) {
        cache = await caches.open(middleware.constructor.name);
      }

      let response = await cache.match(request);
      if (response !== undefined) {
        // Request is cached
        return response;
      }

      // Set to true when the middleware this wraps calls next().
      //  We only want to cache the result for this middleware,
      //  not the one after this.
      let wasDeferred = false;

      response = await middleware.handle(request, ctx, () => {
        wasDeferred = true;
        return next();
      });

      if (!wasDeferred && response.status === 200) {
        // Successful request, let's cache it for next time
        const cachedResponse = response.clone();
        cachedResponse.headers.append('x-cache-status', 'hit');

        ctx.execution.waitUntil(cache.put(request, cachedResponse));
      }

      response.headers.append('x-cache-status', 'miss');

      return response;
    },
  };

  return wrapper;
}
