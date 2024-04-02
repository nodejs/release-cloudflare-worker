import { CACHE_HEADERS } from '../constants/cache';

export default (): Response => {
  return new Response(undefined, {
    status: 400,
    headers: {
      'cache-control': CACHE_HEADERS.failure,
    },
  });
};
