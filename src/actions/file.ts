import { Context } from '../context';
import { R2Provider } from '../providers/r2Provider';
import fileNotFound from '../responses/fileNotFound';

export async function headFile(path: string, ctx: Context): Promise<Response> {
  const provider = new R2Provider({ ctx });
  const result = await provider.headFile(path);

  if (result === undefined) {
    return fileNotFound(false);
  }

  return new Response(undefined, {
    status: result.httpStatusCode,
    headers: result.httpHeaders,
  });
}
