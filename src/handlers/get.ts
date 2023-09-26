import responses from '../responses';
import {
  isCacheEnabled,
  isDirectoryPath,
  mapUrlPathToBucketPath,
  parseUrl,
} from '../util';
import { Handler } from './handler';
import { listDirectory } from './helpers/directory';
import { getFile } from './helpers/file';

const getHandler: Handler = async (request, env, ctx, cache) => {
  const shouldServeCache = isCacheEnabled(env);
  if (shouldServeCache) {
    // Caching is enabled, let's see if the request is cached
    const response = await cache.match(request);

    if (typeof response !== 'undefined') {
      response.headers.append('x-cache-status', 'hit');

      return response;
    }
  }

  const url = parseUrl(request);
  if (url === undefined) {
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
      await listDirectory(url, request, bucketPath, env)
    : // File requested, try to serve it
      await getFile(url, request, bucketPath, env);

  // Cache response if cache is enabled
  if (shouldServeCache && response.status !== 304 && response.status !== 206) {
    ctx.waitUntil(cache.put(request, response.clone()));
  }

  response.headers.append('x-cache-status', 'miss');
  return response;
};

export default getHandler;
