#!/usr/bin/env node
// @ts-check

/**
 * Update the most commonly updated paths in the directory cache for a Node.js
 * release.
 *
 * Usage: update-directory-cache.mjs <version>
 */

import {
  DIRECTORY_CACHE_NAMESPACE_ID,
  DOCS_DIR,
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
  handleReleaseDirectory,
  addSymlinksToDirectoryCache,
} from './utils.mjs';

const VERSION = process.argv[2];

if (!VERSION) {
  throw new TypeError('version missing from args');
}

// Ensure all necessary environment variables are set
for (const envVar of [
  // 'CLOUDFLARE_API_TOKEN',
  'CF_ACCESS_KEY_ID',
  'CF_SECRET_ACCESS_KEY',
]) {
  if (!process.env[envVar]) {
    throw new TypeError(`${envVar} missing from process.env`);
  }
}

const s3Client = createS3Client(
  process.env.CF_ACCESS_KEY_ID,
  process.env.CF_SECRET_ACCESS_KEY
);

const cfClient = createCloudflareClient();

const ALWAYS_UPDATED_PATHS = [RELEASE_DIR, DOCS_DIR];

// List the directory of the new release (and subdirectories)
const directories = await listR2DirectoryRecursive(
  s3Client,
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
  PROD_BUCKET,
  directories.get(RELEASE_DIR),
  directories
);

await handleReleaseDirectory(s3Client, directories, latestVersions);

await addSymlinksToDirectoryCache(
  s3Client,
  directories,
  latestVersions['latest']
);

// Update keys in the directory cache
console.log(`Writing ${directories.size} keys to directory cache...`);
await writeKeysToKv(cfClient, DIRECTORY_CACHE_NAMESPACE_ID, directories);
