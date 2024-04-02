import { Env } from './env';
import handlers from './handlers';
import { Toucan } from 'toucan-js';
import responses from './responses';
import { Context } from './context';

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
      switch (request.method) {
        case 'HEAD':
        case 'GET':
          return await handlers.get(request, context);
        case 'POST':
          return await handlers.post(request, context);
        case 'OPTIONS':
          return await handlers.options(request, context);
        default:
          return responses.methodNotAllowed();
      }
    } catch (e) {
      // Send to sentry, if it's disabled this will just noop
      sentry.captureException(e);

      return responses.internalServerError(e, env);
    }
  },
};

export default cloudflareWorker;
