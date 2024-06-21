import { CACHE_HEADERS } from '../constants/cache';
import { Context } from '../context';
import { R2Provider } from '../providers/r2Provider';
import responses from '../responses';
import { hasTrailingSlash, isDirectoryPath } from '../utils/path';
import { Middleware } from './middleware';
import { REDIRECT_MAP } from '../constants/r2Prefixes';
import { Request } from '../routes/request';
import { renderDirectoryListing } from '../utils/directoryListing';
import { parseConditionalHeaders } from '../utils/request';

// @ts-expect-error lazy loaded
let provider: R2Provider = undefined;

export class R2Middleware implements Middleware {
  async handle(request: Request, ctx: Context): Promise<Response> {
    if (provider === undefined) {
      provider = new R2Provider({ ctx });
    }

    const path = getR2Path(request);
    const isPathADirectory = isDirectoryPath(path);

    // console.log(`path='${path}' directory=${isPathADirectory}`);
    //  return new Response(`path='${path}' directory=${isPathADirectory} params=${JSON.stringify(request.params)}`);

    return isPathADirectory
      ? handleDirectory(request, path)
      : handleFile(request, path);
  }
}

async function handleDirectory(
  request: Request,
  r2Path: string
): Promise<Response> {
  if (!hasTrailingSlash(request.urlObj.pathname)) {
    return Response.redirect(request.urlObj + '/', 301);
  }

  const result = await provider.readDirectory(r2Path);
  if (result === undefined) {
    return responses.directoryNotFound(request);
  }

  if (result.hasIndexHtmlFile) {
    return handleFile(request, r2Path + '/index.html');
  }

  let lastModified: Date | undefined = undefined;
  for (const file of result.files) {
    if (lastModified === undefined || file.lastModified > lastModified) {
      lastModified = file.lastModified;
    }
  }

  let responseBody: string | undefined = undefined;
  if (request.method === 'GET') {
    responseBody = renderDirectoryListing(request.urlObj, result);
  }

  return new Response(responseBody, {
    headers: {
      'last-modified': (lastModified ?? new Date()).toUTCString(),
      'content-type': 'text/html',
      'cache-control': CACHE_HEADERS.success,
    },
  });
}

function handleFile(request: Request, r2Path: string): Promise<Response> {
  switch (request.method) {
    case 'HEAD':
      return headFile(request, r2Path);
    case 'GET':
      return getFile(request, r2Path);
  }

  throw new Error('R2Middleware handleFile unsupported method');
}

async function headFile(request: Request, r2Path: string): Promise<Response> {
  const result = await provider.headFile(r2Path);
  if (result === undefined) {
    return responses.fileNotFound(request);
  }

  return new Response(undefined, {
    status: result.httpStatusCode,
    headers: result.httpHeaders,
  });
}

async function getFile(request: Request, r2Path: string): Promise<Response> {
  const result = await provider.getFile(r2Path, {
    conditionalHeaders: parseConditionalHeaders(request.headers),
  });

  if (result === undefined) {
    return responses.fileNotFound(request);
  }

  return new Response(result.contents, {
    status: result.httpStatusCode,
    headers: result.httpHeaders,
  });
}

function getR2Path({
  urlObj,
  params,
}: Pick<Request, 'urlObj' | 'params'>): string {
  // tofo get better name for path
  const { pathname } = urlObj;
  const path = params.path ?? '';

  if (pathname.startsWith('/dist')) {
    return `nodejs/release/${path}`;
  } else if (pathname.startsWith('/download')) {
    return `nodejs/${path}`;
  } else if (pathname.startsWith('/api')) {
    return REDIRECT_MAP.get('nodejs/release/latest') + '/docs/api/' + path;
  } else if (pathname.startsWith('/docs')) {
    if (params.version !== undefined) {
      // /docs/vX.X.X at minimum
      return `nodejs/release/${params.version}/docs/${path}`;
    } else {
      // Just /docs
      // TODO: this doesn't list this properly
      return `nodejs/release/`;
    }
  } else if (pathname.startsWith('/metrics')) {
    // Substring to cut off the leading /
    return pathname.substring(1);
  }

  throw new Error(`unhandled path case: ${pathname}`);
}
