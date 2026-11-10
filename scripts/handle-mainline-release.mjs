#!/usr/bin/env node

/**
 * Updates the cached directory listings for paths that have symlinks for the
 * mainline release bucket.
 *
 * Usage: ./handle-mainline-release.mjs
 *
 * If no version is provided, this just updates what's in {@link ALWAYS_UPDATED_PATHS}
 */

import { listR2Directory } from '../lib/listR2Directory.mjs';
import {
  ALWAYS_UPDATED_PATHS,
  DIRECTORY_CACHE_NAMESPACE_ID,
  PROD_BUCKET,
  RELEASE_DIR,
} from './constants.mjs';
import { addSymlinksToDirectoryCache } from './utils/addSymlinksToDirectoryCache.mjs';
import { getLatestVersionMapping } from './utils/getLatestVersionMapping.mjs';
import { createCloudflareClient, writeKeysToKv } from './utils/kv.mjs';
import { createS3Client, listR2DirectoryRecursive } from './utils/r2.mjs';

// Ensure all necessary environment variables are set
for (const envVar of [
  'CLOUDFLARE_API_TOKEN',
  'S3_ACCESS_KEY_ID',
  'S3_ACCESS_KEY_SECRET',
]) {
  if (!process.env[envVar]) {
    throw new TypeError(`${envVar} missing from process.env`);
  }
}

// Create the clients that we need for fetching the data
const s3Client = createS3Client(
  process.env.S3_ACCESS_KEY_ID,
  process.env.S3_ACCESS_KEY_SECRET
);

const cfClient = createCloudflareClient();

/**
 * @type {import('./utils/r2.mjs').DirectoryListMapping}
 */
const directories = new Map();

// Non-recursively list the paths that we always want to update
await Promise.all(
  ALWAYS_UPDATED_PATHS.map(path =>
    listR2Directory(s3Client, PROD_BUCKET, path)
      .then(value => {
        if (value === undefined) {
          throw new TypeError(
            `directory '${path}' not found in '${PROD_BUCKET}'`
          );
        }

        directories.set(path, value);
      })
      .catch(err => {
        throw err;
      })
  )
);

const latestVersions = await getLatestVersionMapping(
  s3Client,
  directories.get(RELEASE_DIR),
  directories
);

await addSymlinksToDirectoryCache(s3Client, directories, latestVersions);

// Update keys in the directory cache. These intentionally do not have an
// expiration set since they were made with info that the worker doesn't have
// when deployed.
console.log(`Writing ${directories.size} keys to directory cache...`);
await writeKeysToKv(cfClient, DIRECTORY_CACHE_NAMESPACE_ID, directories);
