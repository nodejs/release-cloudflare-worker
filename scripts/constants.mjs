import { dirname, join } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';

export const CF_ACCOUNT_TAG =
  process.env.CF_ACCOUNT_TAG ?? '07be8d2fbc940503ca1be344714cb0d1';

export const R2_ENDPOINT =
  process.env.R2_ENDPOINT ??
  `https://${CF_ACCOUNT_TAG}.r2.cloudflarestorage.com`;

/**
 * The id of the KV namespace used for caching directories
 */
export const DIRECTORY_CACHE_NAMESPACE_ID =
  process.env.DIRECTORY_CACHE_NAMESPACE_ID ?? '';

export const R2_RETRY_COUNT = 5;
export const KV_RETRY_COUNT = 5;

export const PROD_BUCKET = process.env.PROD_BUCKET ?? 'dist-prod';
export const STAGING_BUCKET = process.env.STAGING_BUCKET ?? 'dist-staging';

export const RELEASE_DIR = 'nodejs/release/';
export const DOCS_DIR = 'nodejs/docs/';

export const DEV_BUCKET_PATH = join(import.meta.dirname, '..', 'dev-bucket');
