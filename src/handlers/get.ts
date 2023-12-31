import { CACHE } from '../constants/cache';
import { BAD_REQUEST, FILE_NOT_FOUND } from '../constants/commonResponses';
import { VIRTUAL_DIRS } from '../constants/r2Prefixes';
import {
  isCacheEnabled,
  isDirectoryPath,
  hasTrailingSlash,
  mapUrlPathToBucketPath,
  parseUrl,
} from '../util';
import { Handler } from './handler';
import {
  listDirectory,
  renderDirectoryListing,
} from './strategies/directoryListing';
import { getFile } from './strategies/serveFile';

const getHandler: Handler = async (request, env, ctx) => {
  const shouldServeCache = isCacheEnabled(env);

  if (shouldServeCache) {
    // Caching is enabled, let's see if the request is cached
    const response = await CACHE.match(request);

    if (typeof response !== 'undefined') {
      return response;
    }
  }

  const requestUrl = parseUrl(request);

  if (requestUrl === undefined) {
    return BAD_REQUEST;
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
      return FILE_NOT_FOUND(request);
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
    response = await listDirectory(requestUrl, request, bucketPath, env);
  } else {
    // Fetch the file
    response = await getFile(requestUrl, request, bucketPath, env);
  }

  if (request.method === 'HEAD') {
    return response;
  }

  // Cache response if cache is enabled
  if (shouldServeCache && response.status === 200) {
    const cachedResponse = response.clone();

    cachedResponse.headers.append('x-cache-status', 'hit');

    ctx.waitUntil(CACHE.put(request, cachedResponse));
  }

  response.headers.append('x-cache-status', 'miss');

  return response;
};

export default getHandler;
