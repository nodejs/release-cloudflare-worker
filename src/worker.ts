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

    if (env.LOG_ERRORS === true) {
      const originalCaptureException = sentry.captureException.bind(sentry);

      sentry.captureException = (exception, hint): string => {
        const exceptionStr =
          exception instanceof Error ? exception.stack : exception;

        console.error(
          `sentry.captureException called (hint=${hint}): ${exceptionStr}`
        );

        return originalCaptureException(exception, hint);
      };
    }

    try {
      const context: Context = {
        sentry,
        env: env,
        execution: ctx,
      };

      if (
        env.ENVIRONMENT === 'staging' &&
        request.url.endsWith('/_657ee98d-f9d3-46cd-837b-f58a88add70a')
      ) {
        throw new Error('sentry source map testing');
      }

      return await router.handle(request, context);
    } catch (e) {
      // Send to sentry, if it's disabled this will just noop
      sentry.captureException(e);

      return responses.internalServerError(e, env);
    }
  },
};
