import { CACHE_HEADERS } from '../constants/cache';
import { Context } from '../context';
import {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  HttpResponseHeaders,
  Provider,
  ReadDirectoryResult,
} from './provider';

type OriginProviderCtorOptions = {
  ctx: Context;
};

/**
 * Serves assets from origin.nodejs.org, used as a fallback for if R2 fails.
 */
export class OriginProvider implements Provider {
  private ctx: Context;

  constructor({ ctx }: OriginProviderCtorOptions) {
    this.ctx = ctx;
  }

  async headFile(path: string): Promise<HeadFileResult | undefined> {
    const res = await fetch(this.ctx.env.ORIGIN_HOST + path, {
      method: 'HEAD',
      headers: {
        'user-agent': 'release-cloudflare-worker',
      },
    });

    if (res.status === 404) {
      return undefined;
    }

    return {
      httpStatusCode: res.status,
      httpHeaders: originHeadersToOurHeadersObject(res.headers),
    };
  }

  async getFile(
    path: string,
    options?: GetFileOptions | undefined
  ): Promise<GetFileResult | undefined> {
    const res = await fetch(this.ctx.env.ORIGIN_HOST + path, {
      headers: {
        'user-agent': 'release-cloudflare-worker',
        'if-match': options?.conditionalHeaders?.ifMatch ?? '',
        'if-none-match': options?.conditionalHeaders?.ifMatch ?? '',
        'if-modified-since':
          options?.conditionalHeaders?.ifModifiedSince?.toUTCString() ?? '',
        'if-unmodified-since':
          options?.conditionalHeaders?.ifUnmodifiedSince?.toUTCString() ?? '',
        range: options?.rangeHeader ?? '',
      },
    });

    if (res.status === 404) {
      return undefined;
    }

    return {
      contents: res.body,
      httpStatusCode: res.status,
      httpHeaders: originHeadersToOurHeadersObject(res.headers),
    };
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const res = await fetch(this.ctx.env.ORIGIN_HOST + path, {
      headers: {
        'user-agent': 'release-cloudflare-worker',
      },
    });

    if (res.status === 404) {
      return undefined;
    }

    return {
      body: res.body,
      httpStatusCode: res.status,
      httpHeaders: originHeadersToOurHeadersObject(res.headers),
    };
  }
}

function originHeadersToOurHeadersObject(
  headers: Headers
): HttpResponseHeaders {
  return {
    etag: headers.get('etag') ?? '',
    'accept-range': headers.get('accept-range') ?? 'bytes',
    'access-control-allow-origin':
      headers.get('access-control-allow-origin') ?? '',
    'cache-control': CACHE_HEADERS.failure, // We don't want to cache these responses
    'last-modified': headers.get('last-modified') ?? '',
    'content-language': headers.get('content-language') ?? '',
    'content-disposition': headers.get('content-disposition') ?? '',
    'content-length': headers.get('content-length') ?? '0',
  };
}
