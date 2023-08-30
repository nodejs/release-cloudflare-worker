/**
 * Common responses
 */
export default {
  METHOD_NOT_ALLOWED: new Response(undefined, {
    status: 405,
    headers: {
      Allow: 'GET, HEAD, OPTIONS',
    },
  }),
  FILE_NOT_FOUND: (request: Request): Response => {
    return new Response(
      request.method !== 'HEAD' ? 'File not found' : undefined,
      {
        status: 404,
      }
    );
  },
  DIRECTORY_NOT_FOUND: (request: Request): Response => {
    return new Response(
      request.method !== 'HEAD' ? 'Directory not found' : undefined,
      {
        status: 404,
      }
    );
  },
};
