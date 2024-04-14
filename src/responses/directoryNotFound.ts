import { CACHE_HEADERS } from '../constants/cache';

export default (hasBody: boolean): Response => {
  return new Response(
    hasBody ? 'Directory not found' : undefined,
    {
      status: 404,
      headers: {
        'cache-control': CACHE_HEADERS.failure,
      },
    }
  );
};
