import assert from 'node:assert';
import { it } from 'node:test';
import { Router } from '../../../src/routes/router';
import { Middleware } from '../../../src/middleware/middleware';

it('middleware chains properly', async () => {
  const callOrdered: string[] = [];

  const firstMiddleware: Middleware = {
    handle: (_, _2, next) => {
      callOrdered.push('first');
      return next();
    },
  };
  const secondMiddleware: Middleware = {
    handle: (_, _2, next) => {
      callOrdered.push('second');
      return next();
    },
  };
  const thirdMiddleware: Middleware = {
    handle: () => {
      callOrdered.push('third');
      return Promise.resolve(new Response('cool response'));
    },
  };

  const router = new Router();
  router.get('/', [firstMiddleware, secondMiddleware, thirdMiddleware]);

  // @ts-expect-error context
  const response = await router.handle(new Request('http://localhost/'), {});
  assert.strictEqual(await response.text(), 'cool response');
  assert.deepStrictEqual(callOrdered, ['first', 'second', 'third']);
});

it('errors in middleware get skipped & reported', async () => {
  const errorToThrow = new Error('error from first middleware');
  const firstMiddleware: Middleware = {
    handle: () => {
      throw errorToThrow;
    },
  };
  const secondMiddleware: Middleware = {
    handle: (_, _2, next) => {
      return Promise.resolve(new Response('response from second middleware'));
    },
  };

  const router = new Router();
  router.get('/', [firstMiddleware, secondMiddleware]);

  const response = await router.handle(new Request('http://localhost/'), {
    sentry: {
      // @ts-expect-error incorrect signature but it's fine
      captureException(exception) {
        // Make sure sentry gets the error
        assert.strictEqual(exception, errorToThrow);
      },
    },
  });
  assert.strictEqual(await response.text(), 'response from second middleware');
});
