import { expect, test } from 'vitest';
import type { Middleware } from '../middleware/middleware';
import { type Context } from '../context';
import { Router } from './router';

test('middleware chains properly', async () => {
  const callOrder: string[] = [];

  const firstMiddleware: Middleware = {
    handle: (_, _2, next) => {
      callOrder.push('first');
      return next();
    },
  };
  const secondMiddleware: Middleware = {
    handle: (_, _2, next) => {
      callOrder.push('second');
      return next();
    },
  };
  const thirdMiddleware: Middleware = {
    handle: () => {
      callOrder.push('third');
      return Promise.resolve(new Response('cool response'));
    },
  };

  const router = new Router();
  router.get('/', [firstMiddleware, secondMiddleware, thirdMiddleware]);

  // @ts-expect-error don't need a complete context
  const ctx: Context = {};

  const response = await router.handle(new Request('http://localhost/'), ctx);
  expect(await response.text()).toStrictEqual('cool response');
  expect(callOrder).toStrictEqual(['first', 'second', 'third']);
});

test('errors in middleware get skipped & reported', async () => {
  const errorToThrow = new Error('error from first middleware');
  const firstMiddleware: Middleware = {
    handle: () => {
      throw errorToThrow;
    },
  };
  const secondMiddleware: Middleware = {
    handle: (_, _2, _3) => {
      return Promise.resolve(new Response('response from second middleware'));
    },
  };

  const router = new Router();
  router.get('/', [firstMiddleware, secondMiddleware]);

  const response = await router.handle(new Request('http://localhost/'), {
    // @ts-expect-error missing properties we don't need
    env: {},
    sentry: {
      // @ts-expect-error incorrect signature but it's fine
      captureException(exception) {
        // Make sure sentry gets the error
        expect(exception).toStrictEqual(errorToThrow);
      },
    },
  });
  expect(await response.text()).toStrictEqual(
    'response from second middleware'
  );
});
