import responses from '../responses';
import type { Request } from '../routes/request';
import type { Middleware } from './middleware';

export class NotFoundMiddleware implements Middleware {
  handle(request: Request): Promise<Response> {
    return Promise.resolve(responses.fileNotFound(request.method));
  }
}
