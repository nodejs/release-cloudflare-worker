import { Toucan } from 'toucan-js';
import type { Env } from './env';
import responses from './responses';
import type { Context } from './context';
import { Router } from './routes/router';
import { registerRoutes } from './routes';

const router: Router = new Router();
registerRoutes(router);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      request,
      context: ctx,
      requestDataOptions: {
        allowedHeaders: true,
      },
    });

    sentry.setTag('request_id', crypto.randomUUID());

    if (env.LOG_ERRORS === true) {
      const originalCaptureException = sentry.captureException.bind(sentry);

      sentry.captureException = (exception, hint): string => {
        console.error(exception, `(hint=${hint})`);

        return originalCaptureException(exception, hint);
      };
    }

    const context: Context = {
      sentry,
      env: env,
      execution: ctx,
    };

    try {
      const response: unknown = await router.fetch(request, context);

      if (!(response instanceof Response)) {
        // Didn't get a proper response from the router
        throw new TypeError(
          `router response not instanceof Response (typeof=${typeof response}, ctor=${response?.constructor?.name})`
        );
      }

      return response;
    } catch (err) {
      sentry.captureException(err);

      return responses.internalServerError(err, env);
    }
  },
};
