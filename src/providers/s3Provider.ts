import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Context } from '../context';
import {
  File,
  GetFileOptions,
  GetFileResult,
  HeadFileResult,
  Provider,
  ReadDirectoryResult,
} from './provider';
import { retryWrapper } from '../utils/provider';
import { R2_RETRY_LIMIT, S3_MAX_KEYS } from '../constants/limits';

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
  private ctx: Context;
  private client: S3Client;

  constructor({ ctx }: S3ProviderCtorOptions) {
    this.ctx = ctx;

    this.client = new S3Client({
      region: 'auto',
      endpoint: ctx.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: ctx.env.S3_ACCESS_KEY_ID,
        secretAccessKey: ctx.env.S3_ACCESS_KEY_SECRET,
      },
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
    const directories = new Set<string>();
    let hasIndexHtmlFile = false;
    const files: File[] = [];

    let isTruncated = true;
    let cursor: string | undefined;
    while (isTruncated) {
      const result = await retryWrapper(
        async () => {
          return this.client.send(
            new ListObjectsV2Command({
              Bucket: this.ctx.env.BUCKET_NAME,
              Prefix: path,
              Delimiter: '/',
              MaxKeys: S3_MAX_KEYS,
              ContinuationToken: cursor,
            })
          );
        },
        R2_RETRY_LIMIT,
        this.ctx.sentry
      );

      result.CommonPrefixes?.forEach(directory => {
        directories.add(directory.Prefix!.substring(path.length));
      });

      result.Contents?.forEach(object => {
        if (object.Key!.endsWith('index.html')) {
          hasIndexHtmlFile = true;
        }

        files.push({
          name: object.Key!.substring(path.length),
          size: object.Size!,
          lastModified: object.LastModified!,
        });
      });

      isTruncated = result.IsTruncated ?? false;
      cursor = result.NextContinuationToken;
    }

    if (directories.size === 0 && files.length === 0) {
      return undefined;
    }

    return {
      subdirectories: Array.from(directories),
      hasIndexHtmlFile,
      files,
    };
  }
}
