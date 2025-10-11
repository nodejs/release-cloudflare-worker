import { describe, expect, test } from 'vitest';
import { Router } from './router';
import type { Middleware } from '../middleware/middleware';
import type { Context } from '../context';

const dummyCtx: Context = {
  // @ts-expect-error don't need full thing
  sentry: {
    captureException(err) {
      // Throw any errors in these tests that are sent to Sentry
      throw err;
    },
  },
};

describe('HTTP methods', () => {
  const dummyMiddleware: Middleware = {
    async handle() {
      return new Response('asd');
    },
  };

  test('all', async () => {
    const router = new Router();
    router.all('/test', dummyMiddleware);

    for (const method of ['OPTIONS', 'GET', 'HEAD', 'POST']) {
      const res = await router.fetch(
        new Request('https://localhost/test', { method }),
        dummyCtx
      );
      expect(res.status).toBe(200);
    }
  });

  test('OPTIONS', async () => {
    const router = new Router();
    router.options('/test', dummyMiddleware);

    {
      const res = await router.fetch(
        new Request('https://localhost/test', { method: 'OPTIONS' }),
        dummyCtx
      );
      expect(res.status).toBe(200);
    }

    expect(
      await router.fetch(new Request('https://localhost/test'), dummyCtx)
    ).toBeUndefined();
  });

  test('HEAD', async () => {
    const router = new Router();
    router.head('/test', dummyMiddleware);

    {
      const res = await router.fetch(
        new Request('https://localhost/test', { method: 'HEAD' }),
        dummyCtx
      );
      expect(res.status).toBe(200);
    }

    expect(
      await router.fetch(new Request('https://localhost/test'), dummyCtx)
    ).toBeUndefined();
  });

  test('GET', async () => {
    const router = new Router();
    router.get('/test', dummyMiddleware);

    {
      const res = await router.fetch(
        new Request('https://localhost/test'),
        dummyCtx
      );
      expect(res.status).toBe(200);
    }

    expect(
      await router.fetch(
        new Request('https://localhost/test', { method: 'OPTIONS' }),
        dummyCtx
      )
    ).toBeUndefined();
  });

  test('POST', async () => {
    const router = new Router();
    router.post('/test', dummyMiddleware);

    {
      const res = await router.fetch(
        new Request('https://localhost/test', { method: 'POST' }),
        dummyCtx
      );
      expect(res.status).toBe(200);
    }

    expect(
      await router.fetch(new Request('https://localhost/test'), dummyCtx)
    ).toBeUndefined();
  });
});

test('adds `urlObj` to request', async () => {
  const router = new Router();

  router.get('/test', {
    async handle(request) {
      expect(request.urlObj).toBeDefined();
      return new Response();
    },
  });

  await router.fetch(new Request('https://localhost/test'), dummyCtx);
});

test('adds `unsubstitutedUrl` to request', async () => {
  const router = new Router();

  const unsubstitutedUrl = new URL('https://localhost/unsubstituted');

  router.get('/test', {
    async handle(request) {
      expect(request.unsubstitutedUrl).toBe(unsubstitutedUrl);
      return new Response();
    },
  });

  await router.fetch(
    new Request('https://localhost/test'),
    dummyCtx,
    unsubstitutedUrl
  );
});

test('handles errors properly', async () => {
  const router = new Router();

  const error = new TypeError('asdf');
  router.get(
    '/test',
    {
      async handle() {
        throw error;
      },
    },
    {
      async handle() {
        return new Response('asd123');
      },
    }
  );

  let reportedToSentry = false;

  const ctx: Context = {
    // @ts-expect-error don't need full thing
    sentry: {
      captureException(err) {
        expect(err).toStrictEqual(error);

        reportedToSentry = true;
        return '';
      },
    },
  };

  const res = await router.fetch(new Request('https://localhost/test'), ctx);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('asd123');
  expect(reportedToSentry).toBeTruthy();
});
