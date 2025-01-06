import { describe, test, expect } from 'vitest';
import { SubtitutionMiddleware } from './subtituteMiddleware';
import type { Request as WorkerRequest } from '../routes/request';
import type { Router } from '../routes';

describe('SubtituteMiddleware', () => {
  test('correctly substitutes url `/dist/latest` to `/dist/v1.0.0`', () => {
    const originalUrl = 'https://localhost/dist/latest';

    const originalRequest: Partial<WorkerRequest> = new Request(originalUrl);
    originalRequest.urlObj = new URL(originalUrl);

    const router: Partial<Router> = {
      handle: (substitutedRequest: WorkerRequest, _, unsubstitutedUrl) => {
        // Has the url been substituted? (latest -> v1.0.0)
        // strictEqual(substitutedRequest.url, 'https://localhost/dist/v1.0.0');
        expect(substitutedRequest.url).toStrictEqual(
          'https://localhost/dist/v1.0.0'
        );

        // Was the original url saved?
        // strictEqual(unsubstitutedUrl, originalRequest.urlObj);
        expect(unsubstitutedUrl).toStrictEqual(originalRequest.urlObj);

        return Promise.resolve(new Response());
      },
    };

    // Sanity pre-checks
    expect(originalRequest.unsubstitutedUrl).toStrictEqual(undefined);
    expect(originalRequest.urlObj!.pathname).toStrictEqual('/dist/latest');

    // @ts-expect-error full router not needed
    const middleware = new SubtitutionMiddleware(router, 'latest', 'v1.0.0');

    // @ts-expect-error full router & ctx not needed
    middleware.handle(originalRequest, {
      sentry: {
        addBreadcrumb: () => {},
      },
    });
  });
});
