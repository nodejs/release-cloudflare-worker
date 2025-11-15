#!/usr/bin/env node
// @ts-check

/**
 * Update the most commonly updated paths in the directory cache for a Node.js
 * release.
 *
 * Usage: update-directory-cache.mjs <version>
 */

import {
  ALWAYS_UPDATED_PATHS,
  DIRECTORY_CACHE_NAMESPACE_ID,
  PROD_BUCKET,
  RELEASE_DIR,
} from './constants.mjs';
import {
  createCloudflareClient,
  createS3Client,
  listR2DirectoryRecursive,
  listR2Directory,
  writeKeysToKv,
  getLatestVersionMapping,
  addSymlinksToDirectoryCache,
} from './utils.mjs';

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
  // 'CLOUDFLARE_API_TOKEN',
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
  `nodejs/release/${VERSION}/`
);

// Non-recursively list the paths that we always want to update
await Promise.all(
  ALWAYS_UPDATED_PATHS.map(path =>
    listR2Directory(s3Client, PROD_BUCKET, path).then(value => {
      directories.set(path, value);
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
