import responses from '../commonResponses';
import {
  isCacheEnabled,
  isDirectoryPath,
  hasTrailingSlash,
  mapUrlPathToBucketPath,
  parseUrl,
} from '../util';
import { Handler } from './handler';
import { listDirectory } from './strategies/directoryListing';
import { getFile } from './strategies/serveFile';

const getHandler: Handler = async (request, env, ctx, cache) => {
  const shouldServeCache = isCacheEnabled(env);

  if (shouldServeCache) {
    // Caching is enabled, let's see if the request is cached
    const response = await cache.match(request);

    if (typeof response !== 'undefined') {
      return response;
    }
  }

  const requestUrl = parseUrl(request);

  if (requestUrl === undefined) {
    return responses.BAD_REQUEST;
  }

  const bucketPath = mapUrlPathToBucketPath(requestUrl, env);

  if (typeof bucketPath === 'undefined') {
    // Directory listing is restricted and we're not on
    //  a supported path, block request
    return new Response('Unauthorized', { status: 401 });
  }

  const isPathADirectory = isDirectoryPath(bucketPath);

  if (isPathADirectory) {
    if (env.DIRECTORY_LISTING === 'off') {
      // File not found since we should only be allowing
      //  file paths if directory listing is off
      return responses.FILE_NOT_FOUND(request);
    }

    if (!hasTrailingSlash(bucketPath)) {
      // We always want to add trailing slashes to a directory URL
      requestUrl.pathname += '/';

      return Response.redirect(requestUrl.toString(), 301);
    }
  }

  // This returns a Promise that returns either a directory listing
  // or a file response based on the requested URL
  const responsePromise: Promise<Response> = isPathADirectory
    ? listDirectory(requestUrl, request, bucketPath, env)
    : getFile(requestUrl, request, bucketPath, env);

  // waits for the response to be resolved (async R2 request)
  const response = await responsePromise;

  // Cache response if cache is enabled
  if (shouldServeCache && response.status !== 304 && response.status !== 206) {
    const cachedResponse = response.clone();

    cachedResponse.headers.append('x-cache-status', 'hit');

    ctx.waitUntil(cache.put(request, cachedResponse));
  }

  response.headers.append('x-cache-status', 'miss');

  return response;
};

export default getHandler;
