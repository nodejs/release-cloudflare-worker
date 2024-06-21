import { CACHE_HEADERS } from '../constants/cache';

export default (method: Request['method']): Response => {
  return new Response(method !== 'HEAD' ? 'Directory not found' : undefined, {
    status: 404,
    headers: {
      'cache-control': CACHE_HEADERS.failure,
    },
  });
};
