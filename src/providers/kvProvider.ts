import { KV_RETRY_LIMIT } from '../../lib/limits.mjs';
import { KV_CACHE_TTL } from '../constants/cache';
import type { Context } from '../context';
import { retryWrapper } from '../utils/provider';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryResult,
} from './provider';
import type { R2Provider } from './r2Provider';

export class KvProvider implements Provider {
  #ctx: Context;
  #r2Provider?: R2Provider;

  constructor(ctx: Context, r2Provider?: R2Provider) {
    this.#ctx = ctx;
    this.#r2Provider = r2Provider;
  }

  headFile(_: string): Promise<HeadFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  getFile(_: string, _2?: GetFileOptions): Promise<GetFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const result = await retryWrapper(async () => {
      return this.#ctx.env.DIRECTORY_CACHE.get<ReadDirectoryResult>(
        path,
        'json'
      );
    }, KV_RETRY_LIMIT);

    if (result === null) {
      if (this.#r2Provider === undefined) {
        return undefined;
      }

      const result = await this.#r2Provider.readDirectory(path);

      if (result !== undefined) {
        this.#ctx.execution.waitUntil(
          this.#ctx.env.DIRECTORY_CACHE.put(path, JSON.stringify(result), {
            expirationTtl: KV_CACHE_TTL,
          })
        );
      }

      return result;
    }

    // Convert last modified from a string to Date object
    result.lastModified = new Date(result.lastModified);

    for (const file of result.files) {
      file.lastModified = new Date(file.lastModified);
    }

    return result;
  }
}
