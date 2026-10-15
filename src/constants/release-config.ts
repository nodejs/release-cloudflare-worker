import { env } from 'cloudflare:workers';
import { type Env } from '../env';

const typedEnv = env as Env;

export type ReleaseConfig = {
  bucket: R2Bucket;
  directoryCache: KVNamespace;
};

export const MAINLINE_RELEASE_CONFIG: ReleaseConfig = {
  bucket: typedEnv.R2_BUCKET,
  directoryCache: typedEnv.DIRECTORY_CACHE,
};

export const UNOFFICIAL_BUILDS_RELEASE_CONFIG: ReleaseConfig = {
  bucket: typedEnv.UNOFFICIAL_BUILDS_BUCKET,
  directoryCache: typedEnv.UNOFFICIAL_BUILDS_DIRECTORY_CACHE,
};
