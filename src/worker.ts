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

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const cache = caches.default;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // This endpoint is called from the sync script to purge
      //  directories that are commonly updated so we don't need to
      //  wait for the cache to expire
      if (
        isCacheEnabled(env) &&
        env.PURGE_API_KEY !== undefined &&
        request.method === 'POST' &&
        request.url === '/_cf/cache-purge'
      ) {
        return cachePurgeHandler(request, cache, env);
      }

      return responses.METHOD_NOT_ALLOWED;
    }

    if (isCacheEnabled(env)) {
      // Caching is enabled, let's see if the request is cached
      const response = await cache.match(request);
      if (response !== undefined) {
        console.log('Cache hit');
        response.headers.append('x-cache-status', 'hit');
        return response;
      }

      console.log('Cache miss');
    }

    const url = new URL(request.url);
    let bucketPath = mapUrlPathToBucketPath(url, env);
    if (bucketPath === undefined) {
      // Directory listing is restricted and we're not on
      //  a supported path, block request
      return new Response('Unauthorized', { status: 401 });
    }
    bucketPath = decodeURIComponent(bucketPath);

    let response: Response;
    if (isDirectoryPath(bucketPath)) {
      // Directory requested, try listing it
      if (env.DIRECTORY_LISTING === 'off') {
        // File not found since we should only be allowing
        //  file paths if directory listing is off
        return responses.FILE_NOT_FOUND(request);
      }
      response = await directoryHandler(url, request, bucketPath, env);
    } else {
      // File requested, try to serve it
      response = await fileHandler(url, request, bucketPath, env);
    }

    // Cache response if cache is enabled
    if (isCacheEnabled(env) && response.status !== 304) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }
    response.headers.append('x-cache-status', 'miss');
    return response;
  },
};
