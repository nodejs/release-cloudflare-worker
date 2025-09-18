import type { Middleware } from './middleware';

/**
 * Middleware that exists just to throw an error
 */
export class ThrowMiddleware implements Middleware {
  handle(): Promise<Response> {
    throw new Error('Throw endpoint hit');
  }
}
