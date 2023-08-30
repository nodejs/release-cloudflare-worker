import { Env } from '../env';

/**
 * Cache purge
 * Purges commonly updated directories from cache so
 *  we don't need to wait for cache to expire
 * @param request Request object itself
 * @param cache Cache to purge
 * @param env Worker env
 */
export default async (
  request: Request,
  cache: Cache,
  env: Env
): Promise<Response> => {
  const providedApiKey = request.headers.get('x-api-key');
  if (providedApiKey !== env.PURGE_API_KEY) {
    return new Response(undefined, { status: 403 });
  }

  // Construct a base url from what this worker
  //  is being hosted on. For prod, it'll be
  //  https://nodejs.org. For dev, it might be
  //  http://localhost:8787
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const promises = new Array<Promise<boolean>>();
  for (const path of env.COMMONLY_UPDATED_PATHS) {
    promises.push(cache.delete(new Request(baseUrl + path)));
  }
  await Promise.allSettled(promises);

  return new Response(undefined, { status: 204 });
};
