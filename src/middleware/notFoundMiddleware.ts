import * as Sentry from '@sentry/cloudflare';
import responses from '../responses';
import type { Request } from '../routes/request';
import type { Middleware } from './middleware';

export class NotFoundMiddleware implements Middleware {
  handle(request: Request): Promise<Response> {
    Sentry.addBreadcrumb({
      category: 'NotFoundMiddleware',
      message: 'hit',
    });

    return Promise.resolve(responses.fileNotFound(request.method));
  }
}
