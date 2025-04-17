import type { Middleware } from './middleware';

/**
 * Subtitutes a string in a request's url to a different value and sends it
 *  back to the router to be handled again.
 *
 * This is useful for paths like /dist/latest/, where we look for `latest` and
 *  replace it with whatever the latest version is and send it back to be
 *  handled by the /dist route.
 */
export class RedirectionMiddleware implements Middleware {
  targetURL: string;

  constructor(targetURL: string) {
    this.targetURL = targetURL;
  }

  async handle(): Promise<Response> {
    return new Response(undefined, {
      status: 308,
      headers: {
        Location: this.targetURL,
      },
    });
  }
}
