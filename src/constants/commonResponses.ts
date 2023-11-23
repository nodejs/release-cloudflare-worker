import { CACHE_HEADERS } from './cache';

export const METHOD_NOT_ALLOWED = new Response(undefined, {
  status: 405,
  headers: {
    allow: 'GET, HEAD, OPTIONS',
    'cache-control': CACHE_HEADERS.failure,
  },
});

export const BAD_REQUEST = new Response(undefined, {
  status: 400,
  headers: {
    'cache-control': CACHE_HEADERS.failure,
  },
});

export const FILE_NOT_FOUND = (request: Request): Response =>
  new Response(request.method !== 'HEAD' ? 'File not found' : undefined, {
    status: 404,
    headers: {
      'cache-control': CACHE_HEADERS.failure,
    },
  });

export const DIRECTORY_NOT_FOUND = (request: Request): Response =>
  new Response(request.method !== 'HEAD' ? 'Directory not found' : undefined, {
    status: 404,
    headers: {
      'cache-control': CACHE_HEADERS.failure,
    },
  });
