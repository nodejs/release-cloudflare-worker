import { CACHE_HEADERS } from '../constants/cache';
import { Middleware } from './middleware';

export class OptionsMiddleware implements Middleware {
  handle(): Promise<Response> {
    return Promise.resolve(
      new Response(undefined, {
        headers: {
          allow: 'GET, HEAD, POST, OPTIONS',
          'cache-control': CACHE_HEADERS.failure,
        },
      })
    );
  }
}
