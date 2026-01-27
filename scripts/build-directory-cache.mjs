#!/usr/bin/env node

/**
 * This is probably not the script you want to run.
 *
 * This script builds the directory cache from scratch, with an optional
 * ability to purge the contents of the cache before doing so.
 *
 * This script should only be ran when there isn't already a directory cache or
 * the current directory cache is corrupted in some way. For other situations,
 * try `./update-directory-cache.mjs`.
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
import { addSymlinksToDirectoryCache } from './utils/addSymlinksToDirectoryCache.mjs';
import { getLatestVersionMapping } from './utils/getLatestVersionMapping.mjs';
import {
  createCloudflareClient,
  deleteKvNamespaceKeys,
  listKvNamespace,
  writeKeysToKv,
} from './utils/kv.mjs';
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

// Create the clients we need to access the data
const s3Client = createS3Client(
  process.env.S3_ACCESS_KEY_ID,
  process.env.S3_ACCESS_KEY_SECRET
);

const cfClient = createCloudflareClient();

// List the entire R2 bucket
const directories = await listR2DirectoryRecursive(s3Client, PROD_BUCKET);
console.log(`Listed ${directories.size} directories from ${PROD_BUCKET}`);

if (!directories.get(RELEASE_DIR)) {
  throw new TypeError(
    `release directory ${RELEASE_DIR} missing in ${PROD_BUCKET}`
  );
}

const latestVersions = await getLatestVersionMapping(
  s3Client,
  directories.get(RELEASE_DIR),
  directories
);

await addSymlinksToDirectoryCache(s3Client, directories, latestVersions);

// Purge directory cache if wanted
if (process.argv[2] === '--purge') {
  const cachedDirectoryKeys = await listKvNamespace(
    cfClient,
    DIRECTORY_CACHE_NAMESPACE_ID
  );
  console.log(`Purging ${cachedDirectoryKeys.size} keys`);

  await deleteKvNamespaceKeys(
    cfClient,
    DIRECTORY_CACHE_NAMESPACE_ID,
    Array.from(cachedDirectoryKeys)
  );
}

// Update keys in the directory cache
console.log(`Writing ${directories.size} keys to directory cache...`);
await writeKeysToKv(cfClient, DIRECTORY_CACHE_NAMESPACE_ID, directories);
