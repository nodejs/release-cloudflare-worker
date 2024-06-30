import responses from '../responses';
import { Request } from '../routes/request';
import { Middleware } from './middleware';

export class NotFoundMiddleware implements Middleware {
  handle(request: Request): Promise<Response> {
    return Promise.resolve(responses.fileNotFound(request));
  }
}
