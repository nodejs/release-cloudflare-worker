import { CACHE_HEADERS } from '../constants/cache';
import type { Context } from '../context';
import type { Request } from '../routes/request';
import { isDirectoryPath } from '../utils/path';
import type { Middleware } from './middleware';

/**
 * Rewrites request to go to the DO/origin server. This is used as a failover
 *  for if we exhaust all of our retries to R2.
 *
 * This server has the exact same assets as R2. We should minimize the amount
 *  of requests that hit this middleware unless there's good reason to do so.
 */
export class OriginMiddleware implements Middleware {
  async handle(request: Request, ctx: Context): Promise<Response> {
    ctx.sentry.addBreadcrumb({
      category: 'OriginMiddleware',
      message: 'hit',
    });

    const res = await fetch(
      `${ctx.env.ORIGIN_HOST}${request.urlObj.pathname}`,
      {
        method: request.method,
        headers: {
          'user-agent': 'release-cloudflare-worker',
          'if-match': request.headers.get('if-match') ?? '',
          'if-none-match': request.headers.get('if-none-match') ?? '',
          'if-modified-since': request.headers.get('if-modified-since') ?? '',
          'if-unmodified-since':
            request.headers.get('if-unmodified-since') ?? '',
          range: request.headers.get('range') ?? '',
        },
      }
    );

    return new Response(res.body, {
      status: res.status,
      headers: {
        etag: res.headers.get('etag') ?? '',
        'accept-range': res.headers.get('accept-range') ?? '',
        'access-control-allow-origin':
          res.headers.get('access-control-allow-origin') ?? '',
        expires: res.headers.get('expires') ?? '',
        'last-modified': res.headers.get('last-modified') ?? '',
        'content-encoding': res.headers.get('content-encoding') ?? '',
        'content-type': res.headers.get('content-type') ?? '',
        'content-language': res.headers.get('content-language') ?? '',
        'content-disposition': res.headers.get('content-disposition') ?? '',
        'content-length': res.headers.get('content-length') ?? '',

        // Don't cache this response on the client if it's a directory listing,
        //  since our listing response might end up differently from nginx's at
        //  some point
        'cache-control': isDirectoryPath(request.urlObj.pathname)
          ? CACHE_HEADERS.failure
          : CACHE_HEADERS.success,
      },
    });
  }
}
