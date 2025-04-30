import type { Middleware } from './middleware';

/**
 * Redirects a path to another URL
 */
export class RedirectionMiddleware implements Middleware {
  targetURL: string;

  constructor(targetURL: string) {
    this.targetURL = targetURL;
  }

  async handle(): Promise<Response> {
    return Response.redirect(this.targetURL, 308);
  }
}
