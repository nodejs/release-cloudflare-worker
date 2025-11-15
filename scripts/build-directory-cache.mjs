#!/usr/bin/env node
// @ts-check

/**
 * This is probably not the script you want to run.
 *
 * This script builds the directory cache from scratch, which uses a _lot_ of
 * memory and a noteable amount of time when ran against the dist-prod bucket.
 *
 * This script should only be ran when there isn't already a directory cache,
 * for other scenarios try `./update-directory-cache.mjs`.
 *
 * Usage: build-directory-cache.mjs [--purge]
 *  --purge: Use with caution. It will delete all elements in the cache and
 *      then rebuild it.
 */

import {
  DIRECTORY_CACHE_NAMESPACE_ID,
  PROD_BUCKET,
  RELEASE_DIR,
} from './constants.mjs';
import {
  addSymlinksToDirectoryCache,
  createCloudflareClient,
  createS3Client,
  deleteKvNamespaceKeys,
  getLatestVersionMapping,
  handleReleaseDirectory,
  listKvNamespace,
  listR2DirectoryRecursive,
  writeKeysToKv,
} from './utils.mjs';

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

// List the entire R2 bucket
const directories = await listR2DirectoryRecursive(s3Client, PROD_BUCKET);
console.log(`Listed ${directories.size} directories from ${PROD_BUCKET}`);

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

// Purge directory cache if wanted
if (process.argv[2] === '--purge') {
  const cachedDirectoryKeys = await listKvNamespace(
    cfClient,
    DIRECTORY_CACHE_NAMESPACE_ID
  );
  console.log(
    `Listed ${cachedDirectoryKeys.size} keys from directory cache to purge`
  );

  await deleteKvNamespaceKeys(
    cfClient,
    DIRECTORY_CACHE_NAMESPACE_ID,
    Array.from(cachedDirectoryKeys)
  );
}

// Update keys in the directory cache
console.log(`Writing ${directories.size} keys to directory cache...`);
await writeKeysToKv(cfClient, DIRECTORY_CACHE_NAMESPACE_ID, directories);
