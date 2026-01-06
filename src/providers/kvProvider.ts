import { KV_RETRY_LIMIT } from '../../common/limits.mjs';
import type { Context } from '../context';
import { retryWrapper } from '../utils/provider';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryResult,
} from './provider';

type KvProviderCtorOptions = {
  ctx: Context;
};

export class KvProvider implements Provider {
  #ctx: Context;

  constructor({ ctx }: KvProviderCtorOptions) {
    this.#ctx = ctx;
  }

  headFile(_: string): Promise<HeadFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  getFile(_: string, _2?: GetFileOptions): Promise<GetFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const result = await retryWrapper(
      async () => {
        return this.#ctx.env.DIRECTORY_CACHE.get<ReadDirectoryResult>(
          path,
          'json'
        );
      },
      KV_RETRY_LIMIT,
      this.#ctx.sentry
    );

    if (result === null) {
      return undefined;
    }

    // Convert last modified from a string to Date object
    result.lastModified = new Date(result.lastModified);

    for (const file of result.files) {
      file.lastModified = new Date(file.lastModified);
    }

    return result;
  }
}
