import { Env } from '../../env';
import { objectHasBody } from '../../util';
import { CACHE_HEADERS } from '../../constants/cache';
import {
  BAD_REQUEST,
  FILE_NOT_FOUND,
  METHOD_NOT_ALLOWED,
} from '../../constants/commonResponses';
import { R2_RETRY_LIMIT } from '../../constants/limits';

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
 * Fetch an object from a R2 bucket with retries
 *  The bindings _might_ have retries, if so this just adds
 *  a little bit more resiliency
 * @param bucket The {@link R2Bucket} to read from
 * @param key Object key
 * @param options Conditional headers, etc.
 */
async function r2GetWithRetries(
  bucket: R2Bucket,
  key: string,
  options?: R2GetOptions
): Promise<R2Object | null> {
  let r2Error: unknown = undefined;
  for (let i = 0; i < R2_RETRY_LIMIT; i++) {
    try {
      return await bucket.get(key, options);
    } catch (err) {
      // Log error & retry
      console.error(`R2 GetObject error: ${err}`);
      r2Error = err;
    }
  }

  // R2 isn't having a good day, return a 500 & log to sentry
  throw new Error(
    `R2 GetObject failed after ${R2_RETRY_LIMIT} retries: ${r2Error}`
  );
}

/**
 * Fetch an object from a R2 bucket with retries
 *  The bindings _might_ have retries, if so this just adds
 *  a little bit more resiliency
 * @param bucket The {@link R2Bucket} to read from
 * @param key Object key
 */
async function r2HeadWithRetries(
  bucket: R2Bucket,
  key: string
): Promise<R2Object | null> {
  let r2Error: unknown = undefined;
  for (let i = 0; i < R2_RETRY_LIMIT; i++) {
    try {
      return await bucket.head(key);
    } catch (err) {
      // Log error & retry
      console.error(`R2 HeadObject error: ${err}`);
      r2Error = err;
    }
  }

  // R2 isn't having a good day, return a 500 & log to sentry
  throw new Error(
    `R2 HeadObject failed after ${R2_RETRY_LIMIT} retries: ${r2Error}`
  );
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
        file = await r2GetWithRetries(env.R2_BUCKET, bucketPath, {
          onlyIf: request.headers,
          range: request.headers,
        });

        break;
      } catch (e) {
        // Unquoted etags make R2 api throw an error
        return BAD_REQUEST;
      }
    case 'HEAD':
      file = await r2HeadWithRetries(env.R2_BUCKET, bucketPath);
      break;
    default:
      return METHOD_NOT_ALLOWED;
  }

  if (file === null) {
    return FILE_NOT_FOUND(request);
  }

  const hasBody = objectHasBody(file);

  const statusCode = getStatusCode(request, hasBody);

  return new Response(
    hasBody && file.size != 0 ? (file as R2ObjectBody).body : null,
    {
      status: statusCode,
      headers: {
        etag: file.httpEtag,
        'accept-range': 'bytes',
        // https://github.com/nodejs/build/blob/e3df25d6a23f033db317a53ab1e904c953ba1f00/ansible/www-standalone/resources/config/nodejs.org?plain=1#L194-L196
        'access-control-allow-origin': url.pathname.endsWith('.json')
          ? '*'
          : '',
        'cache-control':
          statusCode === 200
            ? file.httpMetadata?.cacheControl ?? CACHE_HEADERS.success
            : CACHE_HEADERS.failure,
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
