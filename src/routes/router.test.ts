import { describe, expect, test } from 'vitest';
import { Router } from './router';
import type { Middleware } from '../middleware/middleware';
import type { Context } from '../context';

// @ts-expect-error create dummy one here so we don't need to have a bunch of
// ts-expect-errors here
const dummyCtx: Context = {};

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

  router.get(
    '/test',
    {
      async handle() {
        throw new TypeError('asdf');
      },
    },
    {
      async handle() {
        return new Response('asd123');
      },
    }
  );

  const res = await router.fetch(
    new Request('https://localhost/test'),
    // @ts-expect-error don't need full context
    {}
  );
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('asd123');
});
