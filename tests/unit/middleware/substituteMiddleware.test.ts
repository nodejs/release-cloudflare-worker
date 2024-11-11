import assert from 'node:assert';
import { it } from 'node:test';
import type { Request as WorkerRequest } from '../../../src/routes/request';
import { SubtitutionMiddleware } from '../../../src/middleware/subtituteMiddleware';
import { Router } from '../../../src/routes';

it('correctly substitutes url `/dist/latest` to `/dist/v1.0.0`', async () => {
  const originalUrl = 'https://localhost/dist/latest';

  const originalRequest: Partial<WorkerRequest> = {
    ...new Request(originalUrl),
    url: originalUrl,
    urlObj: new URL(originalUrl),
  };

  const router: Partial<Router> = {
    handle: (substitutedRequest: WorkerRequest) => {
      // Is the url is now substituted (latest -> v1.0.0)
      assert.strictEqual(
        substitutedRequest.url,
        'https://localhost/dist/v1.0.0'
      );

      // Did we save the unsubstituted path?
      assert.strictEqual(
        substitutedRequest.unsubtitutedUrl,
        originalRequest.urlObj
      );

      return Promise.resolve(new Response());
    },
  };

  // Pre-checks for sanity
  assert.strictEqual(originalRequest.unsubtitutedUrl, undefined);
  assert.strictEqual(originalRequest.urlObj!.pathname, '/dist/latest');

  // @ts-expect-error full router not needed
  const middleware = new SubtitutionMiddleware(router, 'latest', 'v1.0.0');

  // @ts-expect-error full request & ctx not needed
  middleware.handle(originalRequest, {
    sentry: {
      addBreadcrumb: () => {},
    },
  });
});
