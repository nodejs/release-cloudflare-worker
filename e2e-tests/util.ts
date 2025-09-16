import { env } from 'cloudflare:test';
import { inject } from 'vitest';
import type { Env } from '../env';
import type { Directory } from '../../vitest-setup';

async function populateR2BucketDirectory(directory: Directory): Promise<void> {
  const promises: Array<Promise<unknown>> = [];

  for (const path of Object.keys(directory.files)) {
    const file = directory.files[path];

    promises.push(
      env.R2_BUCKET.put(path, file.contents, {
        customMetadata: {
          // This is added by rclone when copying the release assets to the
          //  bucket.
          mtime: `${file.lastModified}`,
        },
      })
    );
  }

  promises.push(
    ...Object.values(directory.subdirectories).map(populateR2BucketDirectory)
  );

  await Promise.all(promises);
}

/**
 * Writes the contents of the dev bucket into the R2 bucket given in {@link env}
 */
export async function populateR2WithDevBucket(): Promise<void> {
  // Grab the contents of the dev bucket
  const devBucket = inject('devBucket');

  // Write it to R2
  await populateR2BucketDirectory(devBucket);
}

declare module 'cloudflare:test' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
