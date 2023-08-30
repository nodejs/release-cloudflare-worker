import { Env } from '../env';
import { objectHasBody } from '../util';
import responses from '../responses';

/**
 * Decides on what status code to return to
 *  the client. At the time that this is called,
 *  we know the object exists in R2 and we just
 *  need to return the right information about
 *  it to the client.
 * @param request Request object
 * @param objectHasBody Whether or not there is a
 *  `body` property in the R2 response
 * @returns Http status code
 */
function getStatusCode(request: Request, objectHasBody: boolean): number {
  if (objectHasBody) {
    if (request.headers.has('range')) {
      // Range header was sent, this is
      //  only part of the object
      return 206;
    }
    // We have the full object body
    return 200;
  }
  // We weren't given a body
  return 304;
}

/**
 * File handler
 * @param url Parsed url of the request
 * @param request Request object itself
 * @param bucketPath Path in R2 bucket
 * @param env Worker env
 */
export default async (
  url: URL,
  request: Request,
  bucketPath: string,
  env: Env
): Promise<Response> => {
  let file: R2Object | null = null;
  if (request.method === 'GET') {
    file = await env.R2_BUCKET.get(bucketPath, {
      onlyIf: request.headers,
      range: request.headers,
    });
  } else if (request.method === 'HEAD') {
    file = await env.R2_BUCKET.head(bucketPath);
  } else {
    return responses.METHOD_NOT_ALLOWED;
  }

  if (file === null) {
    return responses.FILE_NOT_FOUND(request);
  }

  const hasBody = objectHasBody(file);
  const cacheControl =
    file.httpMetadata?.cacheControl ?? (env.CACHE_CONTROL || 'no-store');
  return new Response(
    hasBody && file.size != 0 ? (file as R2ObjectBody).body : null,
    {
      status: getStatusCode(request, hasBody),
      headers: {
        etag: file.httpEtag,
        'Accept-Range': 'bytes',

        'Access-Control-Allow-Origin': url.pathname.endsWith('.json')
          ? '*'
          : '',

        'Cache-Control': cacheControl,
        expires: file.httpMetadata?.cacheExpiry?.toUTCString() ?? '',

        'Last-Modified': file.uploaded.toUTCString(),
        'Content-Encoding': file.httpMetadata?.contentEncoding ?? '',
        'Content-Type':
          file.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Language': file.httpMetadata?.contentLanguage ?? '',
        'Content-Disposition': file.httpMetadata?.contentDisposition ?? '',
        'Content-Length': file.size.toString(),
      },
    }
  );
};
