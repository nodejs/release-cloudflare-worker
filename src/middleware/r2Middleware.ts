import { CACHE_HEADERS } from '../constants/cache';
import type { Context } from '../context';
import type { GetFileResult } from '../providers/provider';
import { R2Provider } from '../providers/r2Provider';
import responses from '../responses';
import { hasTrailingSlash, isDirectoryPath } from '../utils/path';
import type { Middleware } from './middleware';
import latestVersions from '../constants/latestVersions.json' assert { type: 'json' };
import type { Request } from '../routes/request';
import { renderDirectoryListing } from '../utils/directoryListing';
import { parseConditionalHeaders } from '../utils/request';
import { once } from '../utils/memo';

const getProvider = once((ctx: Context) => new R2Provider({ ctx }));

export class R2Middleware implements Middleware {
  async handle(request: Request, ctx: Context): Promise<Response> {
    const path = getR2Path(request);
    const isPathADirectory = isDirectoryPath(path);

    return isPathADirectory
      ? handleDirectory(request, path, ctx)
      : handleFile(request, path, ctx);
  }
}

function shouldListFiles(path: string): boolean {
  // /docs lists the nodejs/release directory - don't want to include the
  //  files in there for that path
  return !path.startsWith('/docs');
}

async function handleDirectory(
  request: Request,
  r2Path: string,
  ctx: Context
): Promise<Response> {
  if (!hasTrailingSlash(request.urlObj.pathname)) {
    // We always want directory listing requests to have a trailing slash
    const url = request.unsubtitutedUrl ?? request.urlObj;
    return Response.redirect(`${url}/`, 301);
  }

  const result = await getProvider(ctx).readDirectory(r2Path, {
    listFiles: shouldListFiles(request.urlObj.pathname),
  });

  if (result === undefined) {
    return responses.directoryNotFound(request.method);
  }

  if (result.hasIndexHtmlFile) {
    // Prioritize showing index files over directory listings
    return handleFile(request, r2Path + 'index.html', ctx);
  }

  let responseBody;
  if (request.method === 'GET') {
    responseBody = renderDirectoryListing(
      request.unsubtitutedUrl ?? request.urlObj,
      result
    );
  }

  return new Response(responseBody, {
    headers: {
      'last-modified': result.lastModified.toUTCString(),
      'content-type': 'text/html',
      'cache-control': CACHE_HEADERS.success,
    },
  });
}

function handleFile(
  request: Request,
  r2Path: string,
  ctx: Context
): Promise<Response> {
  switch (request.method) {
    case 'HEAD':
      return headFile(request, r2Path, ctx);
    case 'GET':
      return getFile(request, r2Path, ctx);
  }

  throw new Error('R2Middleware handleFile unsupported method');
}

async function headFile(
  request: Request,
  r2Path: string,
  ctx: Context
): Promise<Response> {
  const result = await getProvider(ctx).headFile(r2Path);

  if (result === undefined) {
    return responses.fileNotFound(request.method);
  }

  return new Response(undefined, {
    status: result.httpStatusCode,
    headers: result.httpHeaders,
  });
}

async function getFile(
  request: Request,
  r2Path: string,
  ctx: Context
): Promise<Response> {
  const provider = getProvider(ctx);

  let result: GetFileResult | undefined;
  try {
    result = await provider.getFile(r2Path, {
      conditionalHeaders: parseConditionalHeaders(request.headers),
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('10020')) {
        // Object name not valid, url probably has some weirdness in it
        return new Response(undefined, { status: 400 });
      } else if (err.message.includes('10039')) {
        // Range not compatible, probably out of bounds
        return new Response(undefined, { status: 416 });
      }
    }

    ctx.sentry.captureException(err);
    throw err;
  }

  if (result === undefined) {
    return responses.fileNotFound(request.method);
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
  const { pathname } = urlObj;
  const filePath = params.filePath ?? '';

  if (pathname.startsWith('/dist')) {
    return `nodejs/release/${filePath}`;
  } else if (pathname.startsWith('/download')) {
    return `nodejs/${filePath}`;
  } else if (pathname.startsWith('/api')) {
    return `nodejs/release/${latestVersions['latest']}/docs/api/${filePath}`;
  } else if (pathname.startsWith('/docs')) {
    if (params.version !== undefined) {
      // /docs/vX.X.X at minimum
      return `nodejs/release/${params.version}/docs/${filePath}`;
    } else {
      // Just /docs
      return `nodejs/release/`;
    }
  } else if (pathname.startsWith('/metrics')) {
    // Substring to cut off the leading /
    return pathname.substring(1);
  }

  throw new Error(`unhandled path case: ${pathname}`);
}
