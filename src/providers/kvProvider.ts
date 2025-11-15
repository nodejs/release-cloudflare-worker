import { KV_RETRY_LIMIT } from '../constants/limits';
import type { Context } from '../context';
import { retryWrapper } from '../utils/provider';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryOptions,
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

  async readDirectory(
    path: string,
    options?: ReadDirectoryOptions
  ): Promise<ReadDirectoryResult | undefined> {
    const result = await retryWrapper(
      async () => {
        return this.#ctx.env.DIRECTORIES_NAMESPACE.get<ReadDirectoryResult>(
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

    if (options && !options.listFiles) {
      result.files = [];
    }

    return result;
  }
}
