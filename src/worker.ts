import * as Sentry from '@sentry/cloudflare';
import type { Env } from './env';
import responses from './responses';
import type { Context } from './context';
import { Router } from './routes/router';
import { registerRoutes } from './routes';

const router: Router = new Router();
registerRoutes(router);

export default Sentry.withSentry<Env>(
  env => ({
    dsn: env.SENTRY_DSN,
  }),
  {
    async fetch(
      request: Request,
      env: Env,
      ctx: ExecutionContext
    ): Promise<Response> {
      Sentry.setTag('request_id', crypto.randomUUID());

      // TODO
      // if (env.LOG_ERRORS === true) {
      //   const originalCaptureException = sentry.captureException.bind(sentry);
      //   sentry.captureException = (exception, hint): string => {
      //     console.error(exception, `(hint=${hint})`);
      //     return originalCaptureException(exception, hint);
      //   };
      // }

      const context: Context = {
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
        Sentry.captureException(err);
        return responses.internalServerError(err, env);
      }
    },
  } satisfies ExportedHandler<Env>
);
