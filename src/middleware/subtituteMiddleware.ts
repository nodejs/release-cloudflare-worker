import type { Context } from '../context';
import type { Router } from '../routes';
import type { Request } from '../routes/request';
import type { Middleware } from './middleware';

/**
 * Subtitutes a string in a request's url to a different value and sends it
 *  back to the router to be handled again.
 *
 * This is useful for paths like /dist/latest/, where we look for `latest` and
 *  replace it with whatever the latest version is and send it back to be
 *  handled by the /dist route.
 */
export class SubtitutionMiddleware implements Middleware {
  router: Router;
  searchValue: string;
  replaceValue: string;

  constructor(router: Router, searchValue: string, replaceValue: string) {
    this.router = router;
    this.searchValue = searchValue;
    this.replaceValue = replaceValue;
  }

  handle(request: Request, ctx: Context): Promise<Response> {
    const newUrl = request.url.replaceAll(this.searchValue, this.replaceValue);

    ctx.sentry.addBreadcrumb({
      type: 'navigation',
      category: 'SubstitutionMiddleware',
      data: {
        from: request.url,
        to: newUrl,
      },
    });

    const substitutedRequest = new Request<CfProperties>(
      newUrl,
      new Request(request)
    );

    return this.router.handle(substitutedRequest, ctx, request.urlObj);
  }
}
