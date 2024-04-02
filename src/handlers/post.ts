import responses from '../responses';
import { parseUrl } from '../utils/request';
import { Handler } from './handler';
import { cachePurge } from './strategies/cachePurge';

const postHandler: Handler = async (request, ctx) => {
  const url = parseUrl(request);

  if (url === undefined) {
    return responses.badRequest();
  }

  // This endpoint is called from the sync script to purge
  //  directories that are commonly updated so we don't need to
  //  wait for the cache to expire
  if (url.pathname === '/_cf/cache-purge') {
    return cachePurge(url, request, ctx);
  }

  return new Response(url.pathname, { status: 404 });
};

export default postHandler;
