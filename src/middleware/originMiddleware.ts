import { Context } from '../context';
import { Request } from '../routes/request';
import { Middleware } from './middleware';

/**
 * Rewrites request to go to the DO server
 */
export class OriginMiddleware implements Middleware {
  handle(request: Request, ctx: Context): Promise<Response> {
    const res = fetch(ctx.env.ORIGIN_HOST + request.urlObj.pathname, {
      method: request.method,
      headers: {
        'user-agent': 'release-cloudflare-worker',
        'if-match': request.headers.get('if-match') ?? '',
        'if-none-match': request.headers.get('if-none-match') ?? '',
        'if-modified-since': request.headers.get('if-modified-since') ?? '',
        'if-unmodified-since': request.headers.get('if-unmodified-since') ?? '',
        range: request.headers.get('if-match') ?? '',
      },
    });

    return res;
  }
}
