import { expect, test, vi } from 'vitest';
import { cached } from './cacheMiddleware';
import type { Context } from '../context';
import type { Middleware } from './middleware';

class TestMiddleware implements Middleware {
  #successful = true;

  constructor(successful = true) {
    this.#successful = successful;
  }

  async handle(): Promise<Response> {
    // Returns a cacheable response
    return new Response('asd', { status: this.#successful ? 200 : 500 });
  }
}

test('bypasses cache when caching is disabled', async () => {
  const ctx: Context = {
    // @ts-expect-error don't care
    env: {
      CACHING: false,
    },
    // @ts-expect-error don't care
    execution: {
      waitUntil: (): void => {
        throw new Error('should not hit this');
      },
    },
  };

  const middleware = cached(new TestMiddleware());

  // @ts-expect-error don't need WorkerRequest instance here
  await middleware.handle(new Request('https://localhost'), ctx);
});

test('returns cached response', async () => {
  const request = new Request('https://localhost');
  const cachedResponse = new Response('cached');

  vi.stubGlobal(
    'caches',
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    (() => ({
      open: vi.fn(() => ({
        match(requestToMatch: Request): Promise<Response | undefined> {
          expect(requestToMatch).toStrictEqual(request);
          return Promise.resolve(cachedResponse);
        },
        put(): Promise<void> {
          throw new Error('should not hit this');
        },
      })),
    }))()
  );

  const ctx: Context = {
    // @ts-expect-error don't care
    env: {
      CACHING: true,
    },
  };

  try {
    const middleware = cached(new TestMiddleware());

    // @ts-expect-error don't need WorkerRequest instance here
    const res = await middleware.handle(new Request('https://localhost'), ctx);
    expect(res).toStrictEqual(cachedResponse);
  } finally {
    vi.unstubAllGlobals();
  }
});

test('caches successful response', async () => {
  let responseCached = false;
  const request = new Request('https://localhost');

  vi.stubGlobal(
    'caches',
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    (() => ({
      open: vi.fn(() => ({
        match(): Promise<Response | undefined> {
          return Promise.resolve(undefined);
        },
        put(requestToCache: Request, _: Response): Promise<void> {
          responseCached = true;
          expect(requestToCache).toStrictEqual(request);

          return Promise.resolve();
        },
      })),
    }))()
  );

  const ctx: Context = {
    // @ts-expect-error don't care
    env: {
      CACHING: true,
    },
    // @ts-expect-error don't care
    execution: {
      waitUntil(_: Promise<unknown>): void {},
    },
  };

  try {
    const middleware = cached(new TestMiddleware());

    // @ts-expect-error don't need WorkerRequest instance here
    const res = await middleware.handle(request, ctx);
    expect(await res.text()).toStrictEqual('asd');

    expect(responseCached).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
});

test('does not cache non-200 response', async () => {
  vi.stubGlobal(
    'caches',
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    (() => ({
      open: vi.fn(() => ({
        match(): Promise<Response | undefined> {
          return Promise.resolve(undefined);
        },
        put(): Promise<void> {
          throw new Error('should not hit this');
        },
      })),
    }))()
  );

  const ctx: Context = {
    // @ts-expect-error don't care
    env: {
      CACHING: true,
    },
    // @ts-expect-error don't care
    execution: {
      waitUntil(_: Promise<unknown>): void {},
    },
  };

  try {
    const middleware = cached(new TestMiddleware(false));

    // @ts-expect-error don't need WorkerRequest instance here
    const res = await middleware.handle(new Request('https://localhost'), ctx);
    expect(await res.text()).toStrictEqual('asd');
  } finally {
    vi.unstubAllGlobals();
  }
});
