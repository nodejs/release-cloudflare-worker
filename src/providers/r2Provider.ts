import * as Sentry from '@sentry/cloudflare';
import { CACHE_HEADERS } from '../constants/cache';
import { R2_RETRY_LIMIT } from '../../lib/limits.mjs';
import CACHED_DIRECTORIES from '../constants/cachedDirectories.json' assert { type: 'json' };
import { CONTENT_TYPE_OVERRIDES } from '../constants/contentTypeOverrides';
import fileSymlinks from '../constants/fileSymlinks.json' assert { type: 'json' };
import type { Context } from '../context';
import { objectHasBody } from '../utils/object';
import { retryWrapper } from '../utils/provider';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  HttpResponseHeaders,
  Provider,
  ReadDirectoryResult,
} from './provider';
import { S3Provider } from './s3Provider';
import { KvProvider } from './kvProvider';

type CachedFile = {
  name: string;
  lastModified: string | Date;
  size: number;
};

type CachedDirectory = {
  subdirectories: string[];
  hasIndexHtmlFile: boolean;
  files: CachedFile[] | File[];
  lastModified: string | Date;
};

type R2ProviderCtorOptions = {
  ctx: Context;
};

export class R2Provider implements Provider {
  private ctx: Context;

  constructor({ ctx }: R2ProviderCtorOptions) {
    this.ctx = ctx;
  }

  async headFile(path: string): Promise<HeadFileResult | undefined> {
    if (path in fileSymlinks) {
      // @ts-expect-error fileSymlinks is untyped
      path = fileSymlinks[path];
    }

    const object = await retryWrapper(
      async () => await this.ctx.env.R2_BUCKET.head(path),
      R2_RETRY_LIMIT
    );

    if (object === null) {
      return undefined;
    }

    return {
      httpStatusCode: 200,
      httpHeaders: r2MetadataToHeaders(object, 200),
    };
  }

  /**
   * Important: the caller is responsible for wrapping this in a try/catch
   *  and reporting any errors to Sentry
   */
  async getFile(
    path: string,
    options?: GetFileOptions
  ): Promise<GetFileResult | undefined> {
    if (path in fileSymlinks) {
      // @ts-expect-error fileSymlinks is untyped
      path = fileSymlinks[path];
    }

    const object = await retryWrapper(async () => {
      return this.ctx.env.R2_BUCKET.get(path, {
        onlyIf: {
          etagMatches: options?.conditionalHeaders?.ifMatch,
          etagDoesNotMatch: options?.conditionalHeaders?.ifNoneMatch,
          uploadedBefore: options?.conditionalHeaders?.ifUnmodifiedSince,
          uploadedAfter: options?.conditionalHeaders?.ifModifiedSince,
        },
        range: options?.conditionalHeaders?.range,
      });
    }, R2_RETRY_LIMIT);

    if (object === null) {
      return undefined;
    }

    const hasBody = objectHasBody(object);
    const httpStatusCode = determineHttpStatusCode(hasBody, options);

    return {
      contents: hasBody ? (object as R2ObjectBody).body : undefined,
      httpStatusCode,
      httpHeaders: r2MetadataToHeaders(object, httpStatusCode),
    };
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const kvProvider = new KvProvider({
      ctx: this.ctx,
    });

    if (this.ctx.env.USE_KV) {
      return await kvProvider.readDirectory(path);
    }

    let result: ReadDirectoryResult | undefined;
    if (path in CACHED_DIRECTORIES) {
      const cachedResult: CachedDirectory =
        CACHED_DIRECTORIES[path as keyof typeof CACHED_DIRECTORIES];

      if (typeof cachedResult.lastModified === 'string') {
        cachedResult.lastModified = new Date(cachedResult.lastModified);

        for (const file of cachedResult.files) {
          // @ts-expect-error this isn't readonly
          file.lastModified = new Date(file.lastModified);
        }
      }

      result = {
        subdirectories: cachedResult.subdirectories,
        // @ts-expect-error we already handled type difference above
        files: cachedResult.files,
        hasIndexHtmlFile: cachedResult.hasIndexHtmlFile,
        lastModified: new Date(cachedResult.lastModified),
      };
    } else {
      const s3Provider = new S3Provider({
        ctx: this.ctx,
      });

      result = await s3Provider.readDirectory(path);
    }

    // Temporary: compare S3/cached listing result to what the KV provider returns
    if (this.ctx.env.ENVIRONMENT !== 'e2e-tests') {
      this.ctx.execution.waitUntil(
        (async (): Promise<undefined> => {
          try {
            const kvResult = await kvProvider.readDirectory(path);

            if (JSON.stringify(kvResult) !== JSON.stringify(result)) {
              throw new Error('listing mismatch');
            }
          } catch (err) {
            // Either an error when hitting KV or a mismatch between S3 & KV
            Sentry.captureException(
              new Error(`KvProvider error for path ${path}`, { cause: err })
            );
          }
        })()
      );
    }

    return result;
  }
}

function r2MetadataToHeaders(
  object: R2Object,
  httpStatusCode: number
): HttpResponseHeaders {
  const { httpMetadata } = object;

  const fileExtension = object.key.substring(object.key.lastIndexOf('.') + 1);

  const contentType =
    CONTENT_TYPE_OVERRIDES[
      fileExtension as keyof typeof CONTENT_TYPE_OVERRIDES
    ] ??
    object.httpMetadata?.contentType ??
    'application/octet-stream';

  return {
    etag: object.httpEtag,
    'content-type': contentType,
    'accept-range': 'bytes',
    // https://github.com/nodejs/build/blob/e3df25d6a23f033db317a53ab1e904c953ba1f00/ansible/www-standalone/resources/config/nodejs.org?plain=1#L194-L196
    'access-control-allow-origin': object.key.endsWith('.json') ? '*' : '',
    'cache-control':
      httpStatusCode === 200 ? CACHE_HEADERS.success : CACHE_HEADERS.failure,
    expires: httpMetadata?.cacheExpiry?.toUTCString() ?? '',
    'last-modified': getLastModified(object),
    'content-language': httpMetadata?.contentLanguage ?? '',
    'content-disposition': httpMetadata?.contentDisposition ?? '',
    'content-length': object.size.toString(),
    'content-encoding': object.httpMetadata?.contentEncoding ?? '',
  };
}

function areConditionalHeadersPresent(
  options?: Pick<GetFileOptions, 'conditionalHeaders'>
): boolean {
  if (options === undefined || options.conditionalHeaders === undefined) {
    return false;
  }

  const { conditionalHeaders } = options;

  // Only check for if-unmodified-since because the docs said
  //  so, also what nginx does from my experiments
  //  https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412
  return conditionalHeaders.ifUnmodifiedSince !== undefined;
}

function determineHttpStatusCode(
  objectHasBody: boolean,
  options?: GetFileOptions
): number {
  if (objectHasBody) {
    if (options?.conditionalHeaders?.range !== undefined) {
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

  // We weren't given a body
  return 304;
}

function getLastModified(object: R2Object): string {
  // `rclone` sets the mtime custom metadata to the mtime of the original
  // file.
  if (typeof object.customMetadata?.mtime === 'string') {
    return new Date(Number(object.customMetadata.mtime) * 1000).toUTCString();
  } else {
    return object.uploaded.toUTCString();
  }
}
