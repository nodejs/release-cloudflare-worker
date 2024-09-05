import { WorkerEntrypoint } from 'cloudflare:workers';
import { Toucan } from 'toucan-js';
import type { Env } from './env';
import responses from './responses';
import type { Context } from './context';
import { Router } from './routes/router';
import { registerRoutes } from './routes';

const router: Router = new Router();
registerRoutes(router);

export default class extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const sentry = new Toucan({
      dsn: this.env.SENTRY_DSN,
      request,
      context: this.ctx,
      requestDataOptions: {
        allowedHeaders: true,
      },
    });

    try {
      const context: Context = {
        sentry,
        env: this.env,
        execution: this.ctx,
      };

      return await router.handle(request, context);
    } catch (e) {
      // Send to sentry, if it's disabled this will just noop
      sentry.captureException(e);

      return responses.internalServerError(e, this.env);
    }
  }
}
