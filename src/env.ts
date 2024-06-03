export interface Env {
  /**
   * Environment the worker is running in
   */
  ENVIRONMENT: 'dev' | 'staging' | 'prod' | 'e2e-tests';
  /**
   * R2 bucket we read from
   */
  R2_BUCKET: R2Bucket;
  /**
   * Endpoint to hit when using the S3 api.
   */
  S3_ENDPOINT: string;
  /**
   * Id of the api token used for the S3 api.
   * The token needs >=Object Read only permissions
   */
  S3_ACCESS_KEY_ID: string;
  /**
   * Secret of the api token used for the S3 api
   */
  S3_ACCESS_KEY_SECRET: string;
  /**
   * Bucket name
   */
  BUCKET_NAME: string;
  /**
   * Directory listing toggle
   *  on - Enabled for all paths
   *  restricted - Directory listing enabled only for paths we want to be listed
   *  off - No directory
   * In prod, this should *always* be restricted
   */
  DIRECTORY_LISTING: 'on' | 'restricted' | 'off';
  /**
   * Api key for /_cf/cache-purge. If undefined, the endpoint is disabled.
   */
  CACHE_PURGE_API_KEY?: string;
  /**
   * Sentry DSN, used for error monitoring
   * If missing, Sentry isn't used
   */
  SENTRY_DSN?: string;
  /**
   * If true and all retries to R2 fail, we will rewrite the request to
   *  https://direct.nodejs.org
   */
  USE_FALLBACK_WHEN_R2_FAILS: boolean;
  /**
   * Host for the www/Digital Ocean/origin server
   */
  FALLBACK_HOST: string;

  ORIGIN_HOST: string;
}
