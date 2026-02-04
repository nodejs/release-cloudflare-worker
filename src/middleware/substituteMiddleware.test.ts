import { describe, test, expect } from 'vitest';
import { SubtitutionMiddleware } from './subtituteMiddleware';
import type { Request as WorkerRequest } from '../routes/request';
import type { Router } from '../routes/router';

describe('SubtituteMiddleware', () => {
  test('correctly substitutes url `/dist/latest` to `/dist/v1.0.0`', () => {
    const originalUrl = 'https://localhost/dist/latest';

    // @ts-expect-error missing property set on the next line
    const originalRequest: WorkerRequest = new Request(originalUrl);
    originalRequest.urlObj = new URL(originalUrl);

    // @ts-expect-error full router not needed
    const router: Router = {
      fetch: (substitutedRequest: WorkerRequest, _, unsubstitutedUrl) => {
        // Has the url been substituted? (latest -> v1.0.0)
        expect(substitutedRequest.url).toStrictEqual(
          'https://localhost/dist/v1.0.0'
        );

        // Was the original url saved?
        expect(unsubstitutedUrl).toStrictEqual(originalRequest.urlObj);

        return Promise.resolve(new Response());
      },
    };

    // Sanity pre-checks
    expect(originalRequest.unsubstitutedUrl).toStrictEqual(undefined);
    expect(originalRequest.urlObj!.pathname).toStrictEqual('/dist/latest');

    const middleware = new SubtitutionMiddleware(router, 'latest', 'v1.0.0');

    middleware.handle(
      originalRequest,
      // @ts-expect-error don't need full context
      {}
    );
  });
});
