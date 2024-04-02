import { CACHE } from '../constants/cache';
import responses from '../responses';
import { VIRTUAL_DIRS } from '../constants/r2Prefixes';
import { isCacheEnabled } from '../utils/cache';
import {
  isDirectoryPath,
  hasTrailingSlash,
  mapUrlPathToBucketPath,
} from '../utils/path';
import { parseUrl } from '../utils/request';
import { Handler } from './handler';
import {
  listDirectory,
  renderDirectoryListing,
} from './strategies/directoryListing';
import { getFile } from './strategies/serveFile';

const getHandler: Handler = async (request, ctx) => {
  const shouldServeCache = isCacheEnabled(ctx.env);

  if (shouldServeCache) {
    // Caching is enabled, let's see if the request is cached
    const response = await CACHE.match(request);

    if (typeof response !== 'undefined') {
      return response;
    }
  }

  const requestUrl = parseUrl(request);

  if (requestUrl === undefined) {
    return responses.badRequest();
  }

  const bucketPath = mapUrlPathToBucketPath(requestUrl, ctx.env);

  if (typeof bucketPath === 'undefined') {
    // Directory listing is restricted and we're not on
    //  a supported path, block request
    return new Response('Unauthorized', { status: 401 });
  }

  const isPathADirectory = isDirectoryPath(bucketPath);

  if (isPathADirectory) {
    if (ctx.env.DIRECTORY_LISTING === 'off') {
      // File not found since we should only be allowing
      //  file paths if directory listing is off
      return responses.fileNotFound(request);
    }

    if (bucketPath && !hasTrailingSlash(requestUrl.pathname)) {
      // We always want to add trailing slashes to a directory URL
      requestUrl.pathname += '/';

      return Response.redirect(requestUrl.toString(), 301);
    }
  }

  let response: Response;
  if (bucketPath in VIRTUAL_DIRS) {
    // Path requested is to be treated as a symlink to a directory,
    //  list the directory it points to
    response = renderDirectoryListing(
      requestUrl,
      request,
      VIRTUAL_DIRS[bucketPath],
      []
    );
  } else if (isPathADirectory) {
    // List the directory
    response = await listDirectory(requestUrl, request, bucketPath, ctx);
  } else {
    // Fetch the file
    response = await getFile(requestUrl, request, bucketPath, ctx);
  }

  if (request.method === 'HEAD') {
    return response;
  }

  // Responses from fetch() are immutable + we don't want to cache these anyways
  const didRequestFallback = response.url.startsWith(ctx.env.FALLBACK_HOST);

  if (didRequestFallback) {
    return response;
  }

  if (requestUrl.host !== 'nodejs.org') {
    // *.workers.dev, r2.nodejs.org, etc.
    response.headers.append('x-robots-tag', 'noindex, nofollow');
  }

  // Cache response if cache is enabled
  if (shouldServeCache && response.status === 200) {
    const cachedResponse = response.clone();

    cachedResponse.headers.append('x-cache-status', 'hit');

    ctx.execution.waitUntil(CACHE.put(request, cachedResponse));
  }

  response.headers.append('x-cache-status', 'miss');

  return response;
};

export default getHandler;
