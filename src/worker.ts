import { Env } from './env';
import handlers from './handlers';
import { Toucan } from 'toucan-js';
import { CACHE_HEADERS } from './constants/cache';
import { METHOD_NOT_ALLOWED } from './constants/commonResponses';
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
          return METHOD_NOT_ALLOWED;
      }
    } catch (e) {
      // Send to sentry, if it's disabled this will just noop
      sentry.captureException(e);

      let responseBody = 'Internal Server Error';

      if (
        (env.ENVIRONMENT === 'dev' || env.ENVIRONMENT === 'e2e-tests') &&
        e instanceof Error
      ) {
        responseBody += `\nMessage: ${e.message}\nStack trace: ${e.stack}`;
      }

      return new Response(responseBody, {
        status: 500,
        headers: { 'cache-control': CACHE_HEADERS.failure },
      });
    }
  },
};

export default cloudflareWorker;
