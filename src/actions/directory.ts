import { Context } from '../context';
import { OriginProvider } from '../providers/originProvider';
import { R2Provider } from '../providers/r2Provider';
import { enforceDirectoryPathRestrictions } from '../utils/path';
import directoryNotFound from '../responses/directoryNotFound';
import { CACHE_HEADERS } from '../constants/cache';

export async function headDirectory(path: string, ctx: Context) {
  const errorResponse = enforceDirectoryPathRestrictions(path, 'HEAD', ctx.env);
  if (errorResponse !== undefined) {
    return errorResponse;
  }

  const provider = new R2Provider({ ctx, fallbackProvider: new OriginProvider({ ctx }) });
  const result = await provider.readDirectory(path);

  if (result === undefined) {
    return directoryNotFound(false);
  }

  if ('body' in result) {
    // Response from origin
    return new Response(undefined, {
      status: result.httpStatusCode,
      headers: result.httpHeaders
    })
  }

  let lastModified: Date | undefined = undefined;
  for (const file of result.files) {
    if (lastModified === undefined || file.lastModified > lastModified) {
      lastModified = file.lastModified;
    }
  }

  return new Response(undefined, {
    headers: {
      'last-modified': (lastModified ?? new Date()).toUTCString(),
      'content-type': 'text/html',
      'cache-control': CACHE_HEADERS.success
    }
  })
}
