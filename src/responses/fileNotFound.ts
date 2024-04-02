import { CACHE_HEADERS } from '../constants/cache';

export default (request: Request): Response => {
  return new Response(
    request.method !== 'HEAD' ? 'File not found' : undefined,
    {
      status: 404,
      headers: {
        'cache-control': CACHE_HEADERS.failure,
      },
    }
  );
};
