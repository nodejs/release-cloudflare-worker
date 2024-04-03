import { CACHE_HEADERS } from '../constants/cache';

export default (): Response => {
  return new Response(undefined, {
    status: 405,
    headers: {
      allow: 'GET, HEAD, POST, OPTIONS',
      'cache-control': CACHE_HEADERS.failure,
    },
  });
};
