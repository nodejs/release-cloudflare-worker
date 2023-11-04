import { Env } from '../../env';
import { objectHasBody } from '../../util';
import responses from '../../commonResponses';

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
  // Don't return 304 for HEAD requests
  if (request.method === 'HEAD') {
    return 200;
  }

  if (objectHasBody) {
    if (request.headers.has('range')) {
      // Range header was sent, this is
      //  only part of the object
      return 206;
    }

    // We have the full object body
    return 200;
  }

  if (
    request.headers.has('if-match') ||
    request.headers.has('if-unmodified-since')
  ) {
    // No body due to precondition failure
    return 412;
  }

  // We weren't given a body and preconditions succeeded
  return 304;
}

/**
 * File handler
 * @param url Parsed url of the request
 * @param request Request object itself
 * @param bucketPath Path in R2 bucket
 * @param env Worker env
 */
export async function getFile(
  url: URL,
  request: Request,
  bucketPath: string,
  env: Env
): Promise<Response> {
  let file: R2Object | null = null;

  switch (request.method) {
    case 'GET':
      try {
        file = await env.R2_BUCKET.get(bucketPath, {
          onlyIf: request.headers,
          range: request.headers,
        });

        break;
      } catch (e) {
        // Unquoted etags make R2 api throw an error
        return responses.BAD_REQUEST;
      }
    case 'HEAD':
      file = await env.R2_BUCKET.head(bucketPath);
      break;
    default:
      return responses.METHOD_NOT_ALLOWED;
  }

  if (file === null) {
    return responses.FILE_NOT_FOUND(request);
  }

  const hasBody = objectHasBody(file);

  const cacheControl =
    file.httpMetadata?.cacheControl ?? (env.FILE_CACHE_CONTROL || 'no-store');

  return new Response(
    hasBody && file.size != 0 ? (file as R2ObjectBody).body : null,
    {
      status: getStatusCode(request, hasBody),
      headers: {
        etag: file.httpEtag,
        'accept-range': 'bytes',
        // https://github.com/nodejs/build/blob/e3df25d6a23f033db317a53ab1e904c953ba1f00/ansible/www-standalone/resources/config/nodejs.org?plain=1#L194-L196
        'access-control-allow-origin': url.pathname.endsWith('.json')
          ? '*'
          : '',
        'cache-control': cacheControl,
        expires: file.httpMetadata?.cacheExpiry?.toUTCString() ?? '',
        'last-modified': file.uploaded.toUTCString(),
        'content-encoding': file.httpMetadata?.contentEncoding ?? '',
        'content-type':
          file.httpMetadata?.contentType ?? 'application/octet-stream',
        'content-language': file.httpMetadata?.contentLanguage ?? '',
        'content-disposition': file.httpMetadata?.contentDisposition ?? '',
        'content-length': file.size.toString(),
      },
    }
  );
}
