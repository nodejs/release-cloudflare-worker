import { Env } from './env';
import responses from './responses';
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
    switch (request.method) {
      case 'HEAD':
      case 'GET':
        return handlers.get(request, env, ctx, cache);
      case 'POST':
        return handlers.post(request, env, ctx, cache);
      case 'OPTIONS':
        return handlers.options(request, env, ctx, cache);
      default:
        return responses.METHOD_NOT_ALLOWED;
    }
  },
};

export default cloudflareWorker;
