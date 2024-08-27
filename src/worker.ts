import type { Env } from './env';
import { Toucan } from 'toucan-js';
import responses from './responses';
import type { Context } from './context';
import { Router } from './routes/router';
import { registerRoutes } from './routes';

const router: Router = new Router();
registerRoutes(router);

interface Worker {
  /**
   * Worker entrypoint
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-es-modules
   */
  fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response>;
}

const cloudflareWorker: Worker = {
  fetch: async (request, env, ctx) => {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      request,
      context: ctx,
      requestDataOptions: {
        allowedHeaders: true,
        allowedIps: true,
      },
    });

    try {
      const context: Context = {
        sentry,
        env,
        execution: ctx,
      };

      return await router.handle(request, context);
    } catch (e) {
      // Send to sentry, if it's disabled this will just noop
      sentry.captureException(e);

      return responses.internalServerError(e, env);
    }
  },
};

export default cloudflareWorker;
