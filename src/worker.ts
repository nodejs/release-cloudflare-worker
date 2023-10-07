import { Env } from './env';
import responses from './commonResponses';
import handlers from './handlers';

interface Worker {
  /**
   * Worker entrypoint
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-es-modules
   */
  fetch: (r: Request, e: Env, c: ExecutionContext) => Promise<Response>;
}

const cloudflareWorker: Worker = {
  fetch: async (request, env, ctx) => {
    const cache = caches.default;
    try {
      switch (request.method) {
        case 'HEAD':
        case 'GET':
          return await handlers.get(request, env, ctx, cache);
        case 'POST':
          return await handlers.post(request, env, ctx, cache);
        case 'OPTIONS':
          return await handlers.options(request, env, ctx, cache);
        default:
          return responses.METHOD_NOT_ALLOWED;
      }
    } catch (e) {
      let responseBody = 'Internal Server Error';

      if (env.ENVIRONMENT === 'dev' && e instanceof Error) {
        responseBody += `\nMessage: ${e.message}\nStack trace: ${e.stack}`;
      }

      return new Response(responseBody, {
        status: 500,
        headers: { 'cache-control': 'no-store' },
      });
    }
  },
};

export default cloudflareWorker;
