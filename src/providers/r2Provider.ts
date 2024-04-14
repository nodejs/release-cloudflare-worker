import { CACHE_HEADERS } from '../constants/cache';
import { R2_RETRY_LIMIT } from '../constants/limits';
import { Context } from '../context';
import { objectHasBody } from '../utils/object';
import { mapUrlPathToBucketPath } from '../utils/path';
import { retryWrapper } from '../utils/provider';
import {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  HttpResponseHeaders,
  Provider,
  ReadDirectoryResult,
} from './provider';
import { S3Provider } from './s3Provider';

type R2ProviderCtorOptions = {
  ctx: Context;
  fallbackProvider?: Provider;
};

export class R2Provider implements Provider {
  private ctx: Context;

  constructor({ ctx }: R2ProviderCtorOptions) {
    this.ctx = ctx;
  }

  async headFile(path: string): Promise<HeadFileResult | undefined> {
    const r2Path = mapUrlPathToBucketPath(path, this.ctx.env);
    if (r2Path === undefined) {
      return undefined;
    }

    const object = await retryWrapper(
      async () => await this.ctx.env.R2_BUCKET.head(r2Path),
      R2_RETRY_LIMIT,
      this.ctx.sentry
    );

    if (object === null) {
      return undefined;
    }

    return {
      httpStatusCode: 200,
      httpHeaders: r2MetadataToHeaders(object, 200),
    };
  }

  async getFile(
    path: string,
    options?: GetFileOptions
  ): Promise<GetFileResult | undefined> {
    const r2Path = mapUrlPathToBucketPath(path, this.ctx.env);
    if (r2Path === undefined) {
      return undefined;
    }

    const object = await retryWrapper(
      async () => {
        return await this.ctx.env.R2_BUCKET.get(r2Path, {
          onlyIf: {
            etagMatches: options?.conditionalHeaders?.ifMatch,
            etagDoesNotMatch: options?.conditionalHeaders?.ifNoneMatch,
            uploadedBefore: options?.conditionalHeaders?.ifUnmodifiedSince,
            uploadedAfter: options?.conditionalHeaders?.ifModifiedSince,
          },
        });
      },
      R2_RETRY_LIMIT,
      this.ctx.sentry
    );

    if (object === null) {
      return undefined;
    }

    const doesHaveBody = objectHasBody(object);
    const httpStatusCode = determineHttpStatusCode(doesHaveBody, options);

    return {
      contents: doesHaveBody ? (object as R2ObjectBody).body : undefined,
      httpStatusCode,
      httpHeaders: r2MetadataToHeaders(object, httpStatusCode),
    };
  }

  readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const s3Provider = new S3Provider({
      ctx: this.ctx,
      fallbackProvider: this.fallbackProvider,
    });
    return s3Provider.readDirectory(path);
  }
}

function r2MetadataToHeaders(
  object: R2Object,
  httpStatusCode: number
): HttpResponseHeaders {
  const { httpMetadata } = object;

  return {
    etag: object.httpEtag,
    'accept-range': 'bytes',
    // https://github.com/nodejs/build/blob/e3df25d6a23f033db317a53ab1e904c953ba1f00/ansible/www-standalone/resources/config/nodejs.org?plain=1#L194-L196
    'access-control-allow-origin': object.key.endsWith('.json')
      ? '*'
      : undefined,
    'cache-control':
      httpStatusCode === 200 ? CACHE_HEADERS.success : CACHE_HEADERS.failure,
    expires: httpMetadata?.cacheExpiry?.toUTCString(),
    'last-modified': object.uploaded.toUTCString(),
    'content-language': httpMetadata?.contentLanguage,
    'content-disposition': httpMetadata?.contentDisposition,
    'content-length': object.size.toString(),
  };
}

function areConditionalHeadersPresent(
  options?: Pick<GetFileOptions, 'conditionalHeaders'>
): boolean {
  if (options === undefined || options.conditionalHeaders === undefined) {
    return false;
  }

  const { conditionalHeaders } = options;

  return (
    conditionalHeaders.ifMatch !== undefined ||
    conditionalHeaders.ifNoneMatch !== undefined ||
    conditionalHeaders.ifModifiedSince !== undefined ||
    conditionalHeaders.ifUnmodifiedSince !== undefined
  );
}

function determineHttpStatusCode(
  objectHasBody: boolean,
  options?: GetFileOptions
): number {
  if (objectHasBody) {
    if (options?.rangeHeader !== undefined) {
      // Range header is present and we have a body, most likely partial
      return 206;
    }

    // We have the full object body
    return 200;
  }

  if (areConditionalHeadersPresent(options)) {
    // No body due to precondition failure
    return 412;
  }

  // We weren't given a body and preconditions succeeded.
  return 304;
}
