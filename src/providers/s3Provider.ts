import { S3Client } from '@aws-sdk/client-s3';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import type { Context } from '../context';
import type {
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryResult,
} from './provider';
import { listR2Directory } from '../../common/listR2Directory.mjs';

type S3ProviderCtorOptions = {
  ctx: Context;
};

/**
 * This provides assets from an S3-compatible data source. In our case, it's
 *  still R2. We use this only for directory listing. In R2's bindings api,
 *  there's some internal response size limit that makes us need to send
 *  an absurd amount of requests in order to list the full contents of some
 *  directories. Using the S3 api was the recommended fix from the R2 team.
 */
export class S3Provider implements Provider {
  #ctx: Context;
  #client: S3Client;

  constructor({ ctx }: S3ProviderCtorOptions) {
    this.#ctx = ctx;

    this.#client = new S3Client({
      region: 'auto',
      endpoint: ctx.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: ctx.env.S3_ACCESS_KEY_ID,
        secretAccessKey: ctx.env.S3_ACCESS_KEY_SECRET,
      },
      requestHandler: new FetchHttpHandler(),
    });
  }

  headFile(_: string): Promise<HeadFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  getFile(
    _: string,
    _2?: GetFileOptions | undefined
  ): Promise<GetFileResult | undefined> {
    throw new Error('Method not implemented.');
  }

  async readDirectory(path: string): Promise<ReadDirectoryResult | undefined> {
    const result = await listR2Directory(
      this.#client,
      this.#ctx.env.BUCKET_NAME,
      path
    );

    return result;
  }
}
