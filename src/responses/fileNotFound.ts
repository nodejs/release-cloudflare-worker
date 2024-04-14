import { CACHE_HEADERS } from '../constants/cache';

export default (haveBody: boolean): Response => {
  return new Response(haveBody ? 'File not found' : undefined, {
    status: 404,
    headers: {
      'cache-control': CACHE_HEADERS.failure,
    },
  });
};
