#!/usr/bin/env node

/**
 * Update the most commonly updated paths in the directory cache for a Node.js
 * release.
 *
 * Usage: ./update-directory-cache.mjs <version>
 * Example: ./update-directory-cache.mjs v24.0.0
 */

import { listR2Directory } from '../common/listR2Directory.mjs';
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

const VERSION = process.argv[2].toLowerCase();

if (!VERSION) {
  throw new TypeError('version missing from args');
}

if (!VERSION.startsWith('v')) {
  throw new TypeError(
    'provided version not in correct format, expected vX.X.X'
  );
}

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

// List the directory of the new release (and subdirectories)
const directories = await listR2DirectoryRecursive(
  s3Client,
  PROD_BUCKET,
  `${RELEASE_DIR}${VERSION}/`
);

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

// Update keys in the directory cache
console.log(`Writing ${directories.size} keys to directory cache...`);
await writeKeysToKv(cfClient, DIRECTORY_CACHE_NAMESPACE_ID, directories);
