import { env } from 'cloudflare:test';
import { join } from 'node:path';
import { inject } from 'vitest';
import type { Env } from '../src/env';
import type { Directory } from '../vitest-setup';
import type { ReadDirectoryResult, File } from '../src/providers/provider';

async function populateR2BucketDirectory(directory: Directory): Promise<void> {
  const promises: Array<Promise<unknown>> = [];

  for (const path of Object.keys(directory.files)) {
    const file = directory.files[path];

    promises.push(
      env.R2_BUCKET.put(join(directory.name, path), file.contents, {
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

async function populateDirectoryCache(directory: Directory): Promise<void> {
  let hasIndexHtmlFile = false;

  const files: File[] = Object.keys(directory.files).map(name => {
    const file = directory.files[name];

    if (!hasIndexHtmlFile && name.match(/index.htm(?:l)$/)) {
      hasIndexHtmlFile = true;
    }

    return {
      name,
      lastModified: new Date(file.lastModified),
      size: file.size,
    };
  });

  const cachedDirectory: ReadDirectoryResult = {
    subdirectories: Object.keys(directory.subdirectories),
    files,
    hasIndexHtmlFile,
    lastModified: new Date(),
  };

  const promises: Array<Promise<void>> = [
    env.DIRECTORY_CACHE.put(
      `${directory.name}/`,
      JSON.stringify(cachedDirectory)
    ),
    ...Object.values(directory.subdirectories).map(populateDirectoryCache),
  ];

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

export async function populateDirectoryCacheWithDevBucket(): Promise<void> {
  // Grab the contents of the dev bucket
  const devBucket = inject('devBucket');

  // Write it to KV
  await populateDirectoryCache(devBucket);
}

declare module 'cloudflare:test' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
