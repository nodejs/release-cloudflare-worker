import { z } from 'zod';
import { Env } from '../env';
import responses from '../responses';
import { mapBucketPathToUrlPath } from '../util';

const CachePurgeBodySchema = z.object({
  paths: z.array(z.string()),
});
type CachePurgeBody = z.infer<typeof CachePurgeBodySchema>;

/**
 * Parses the body for the cache purge endpoint
 * @param request Request object itself
 * @returns Instance of {@link CachePurgeBody} if successful, or
 *  a {@link Response} otherwise
 */
async function parseBody(request: Request): Promise<CachePurgeBody | Response> {
  // Check to see if we should be receiving json in the first place
  if (request.headers.get('content-type') !== 'application/json') {
    return new Response(undefined, { status: 415 });
  }

  let bodyObject: object;
  try {
    // Parse body to an object
    bodyObject = await request.json<object>();
  } catch (e) {
    // content-type header lied to us
    return responses.BAD_REQUEST;
  }

  // Validate the body's contents
  const parseResult = CachePurgeBodySchema.safeParse(bodyObject);
  if (!parseResult.success) {
    return responses.BAD_REQUEST;
  }

  return parseResult.data;
}

/**
 * Cache purge
 * Purges commonly updated directories from cache so
 *  we don't need to wait for cache to expire
 * @param request Request object itself
 * @param cache Cache to purge
 * @param env Worker env
 */
export default async (
  url: URL,
  request: Request,
  cache: Cache,
  env: Env
): Promise<Response> => {
  const providedApiKey = request.headers.get('x-api-key');
  if (providedApiKey !== env.PURGE_API_KEY) {
    return new Response(undefined, { status: 403 });
  }

  const body = await parseBody(request);
  if (body instanceof Response) {
    return body;
  }

  // Construct a base url from what this worker
  //  is being hosted on. For prod, it'll be
  //  https://nodejs.org. For dev, it might be
  //  http://localhost:8787
  const baseUrl = `${url.protocol}//${url.host}`;

  const promises = new Array<Promise<boolean>>();
  for (const path of body.paths) {
    const urlPaths = mapBucketPathToUrlPath(path, env);
    if (typeof urlPaths === 'undefined') {
      continue;
    }
    for (const urlPath of urlPaths) {
      promises.push(cache.delete(new Request(`${baseUrl}/${urlPath}`)));
    }
  }
  await Promise.allSettled(promises);

  return new Response(undefined, { status: 204 });
};
