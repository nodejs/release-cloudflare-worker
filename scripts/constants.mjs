import { dirname, join } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';

export const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ?? '07be8d2fbc940503ca1be344714cb0d1';

export const R2_ENDPOINT =
  process.env.R2_ENDPOINT ??
  `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * The id of the KV namespace used for caching directories
 */
export const DIRECTORY_CACHE_NAMESPACE_ID =
  process.env.DIRECTORY_CACHE_NAMESPACE_ID ?? 'TODO';

export const PROD_BUCKET = process.env.PROD_BUCKET ?? 'dist-prod';
export const STAGING_BUCKET = process.env.STAGING_BUCKET ?? 'dist-staging';

export const RELEASE_DIR = 'nodejs/release/';
export const DOCS_DIR = 'nodejs/docs/';

export const NODE_LATEST_FILE_NAME = 'node-latest.tar.gz';

export const DEV_BUCKET_PATH = join(import.meta.dirname, '..', 'dev-bucket');
export const CACHED_DIRECTORIES_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'cachedDirectories.json'
);
export const DOCS_DIRECTORY_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'docsDirectory.json'
);
export const LATEST_VERSIONS_MAPPING_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'latestVersions.json'
);
export const STATIC_FILE_SYMLINKS_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'fileSymlinks.json'
);

/**
 * Paths in the R2 bucket that we should always be updating whenever a new
 * version releases.
 */
export const ALWAYS_UPDATED_PATHS = [RELEASE_DIR, DOCS_DIR];
