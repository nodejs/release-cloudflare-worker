import type { Middleware } from './middleware';

export class MethodNotAllowedMiddleware implements Middleware {
  handle(): Promise<Response> {
    return Promise.resolve(new Response(undefined, { status: 405 }));
  }
}
