import { Context } from '../context';
import responses from '../responses';
import type { Request } from '../routes/request';
import type { Middleware } from './middleware';

export class NotFoundMiddleware implements Middleware {
  handle(request: Request, ctx: Context): Promise<Response> {
    ctx.sentry.addBreadcrumb({
      category: 'NotFoundMiddleware',
      message: 'hit',
    });

    return Promise.resolve(responses.fileNotFound(request.method));
  }
}
