import { Env } from './env';
import cachePurgeHandler from './handlers/cachePurge';
import directoryHandler from './handlers/directory';
import fileHandler from './handlers/file';
import {
  isCacheEnabled,
  isDirectoryPath,
  mapUrlPathToBucketPath,
} from './util';
import responses from './responses';

interface Worker {
  /**
   * Worker entrypoint
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-es-modules
   */
  fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response>;
}

const cloudflareWorker: Worker = {
  fetch: async (request, env, ctx) => {
    const cache = caches.default;

    const shouldServeCache = isCacheEnabled(env);

    if (['GET', 'HEAD'].includes(request.method) === false) {
      // This endpoint is called from the sync script to purge
      //  directories that are commonly updated so we don't need to
      //  wait for the cache to expire
      if (
        shouldServeCache &&
        request.method === 'POST' &&
        request.url === '/_cf/cache-purge'
      ) {
        return cachePurgeHandler(request, cache, env);
      }

      if (request.method === 'OPTIONS') {
        return new Response(undefined, {
          headers: {
            Allow: 'GET, HEAD, OPTIONS',
          },
        });
      }

      return responses.METHOD_NOT_ALLOWED;
    }

    if (shouldServeCache) {
      // Caching is enabled, let's see if the request is cached
      const response = await cache.match(request);

      if (typeof response !== 'undefined') {
        response.headers.append('x-cache-status', 'hit');

        return response;
      }
    }

    let url: URL;
    try {
      url = new URL(request.url);
    } catch (e) {
      return new Response(undefined, { status: 400 });
    }

    const bucketPath = mapUrlPathToBucketPath(url, env);

    if (typeof bucketPath === 'undefined') {
      // Directory listing is restricted and we're not on
      //  a supported path, block request
      return new Response('Unauthorized', { status: 401 });
    }

    const isPathADirectory = isDirectoryPath(bucketPath);

    if (isPathADirectory && env.DIRECTORY_LISTING === 'off') {
      // File not found since we should only be allowing
      //  file paths if directory listing is off
      return responses.FILE_NOT_FOUND(request);
    }

    const response: Response = isPathADirectory
      ? // Directory requested, try listing it
        await directoryHandler(url, request, bucketPath, env)
      : // File requested, try to serve it
        await fileHandler(url, request, bucketPath, env);

    // Cache response if cache is enabled
    if (shouldServeCache && response.status !== 304) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }

    response.headers.append('x-cache-status', 'miss');

    return response;
  },
};

export default cloudflareWorker;
