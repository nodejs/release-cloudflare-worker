import responses from '../responses';
import { isCacheEnabled, parseUrl } from '../util';
import { Handler } from './handler';
import { cachePurge } from './strategies/cachePurge';

const postHandler: Handler = async (request, env, _, cache) => {
  const url = parseUrl(request);

  if (url === undefined) {
    return responses.BAD_REQUEST;
  }

  // This endpoint is called from the sync script to purge
  //  directories that are commonly updated so we don't need to
  //  wait for the cache to expire
  if (isCacheEnabled(env) && url.pathname === '/_cf/cache-purge') {
    return cachePurge(url, request, cache, env);
  }

  return new Response(url.pathname, { status: 404 });
};

export default postHandler;
