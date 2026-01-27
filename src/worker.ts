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
      Sentry.setTags({
        request_id: crypto.randomUUID(),
        user_agent: request.headers.get('user-agent'),
        ray_id: request.headers.get('cf-ray'),

        // Type casts needed to keep lsp happy
        ip_country: request.cf?.country as Iso3166Alpha2Code | undefined,
        colo: request.cf?.colo as string | undefined,
      });

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
        console.log('asd');
        Sentry.captureException(err);

        if (env.LOG_ERRORS === true) {
          console.error(err);
        }

        return responses.internalServerError(err, env);
      }
    },
  } satisfies ExportedHandler<Env>
);
