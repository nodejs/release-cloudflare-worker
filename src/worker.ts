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
    switch (request.method) {
      case 'HEAD':
      case 'GET':
        return getHandler(request, env, ctx, cache);
      case 'POST':
        return postHandler(request, env, cache);
      case 'OPTIONS':
        return new Response(undefined, {
          headers: {
            Allow: 'GET, HEAD, OPTIONS',
          },
        });
      default:
        return responses.METHOD_NOT_ALLOWED;
    }
  },
};

async function getHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cache: Cache
): Promise<Response> {
  const shouldServeCache = isCacheEnabled(env);
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
    return responses.BAD_REQUEST;
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
  if (shouldServeCache && response.status !== 304 && response.status !== 206) {
    ctx.waitUntil(cache.put(request, response.clone()));
  }

  response.headers.append('x-cache-status', 'miss');

  return response;
}

async function postHandler(
  request: Request,
  env: Env,
  cache: Cache
): Promise<Response> {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch (e) {
    return responses.BAD_REQUEST;
  }

  // This endpoint is called from the sync script to purge
  //  directories that are commonly updated so we don't need to
  //  wait for the cache to expire
  if (isCacheEnabled(env) && url.pathname === '/_cf/cache-purge') {
    return cachePurgeHandler(url, request, cache, env);
  }

  return new Response(url.pathname, { status: 404 });
}

export default cloudflareWorker;
