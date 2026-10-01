import { KV_RETRY_LIMIT } from '../../lib/limits.mjs';
import { retryWrapper } from '../utils/provider';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryResult,
} from './provider';

export class KvProvider implements Provider {
  #kvNamespace: KVNamespace;

  constructor(kvNamespace: KVNamespace) {
    this.#kvNamespace = kvNamespace;
  }

  headFile(_: string): Promise<HeadFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  getFile(_: string, _2?: GetFileOptions): Promise<GetFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const result = await retryWrapper(async () => {
      return this.#kvNamespace.get<ReadDirectoryResult>(path, 'json');
    }, KV_RETRY_LIMIT);

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
