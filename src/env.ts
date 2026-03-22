export interface Env {
  /**
   * Environment the worker is running in
   */
  ENVIRONMENT: 'dev' | 'staging' | 'prod' | 'e2e-tests';

  /**
   * Should caching be enabled?
   */
  CACHING: boolean;

  LOG_ERRORS?: boolean;

  /**
   * R2 bucket we read from
   */
  R2_BUCKET: R2Bucket;

  /**
   * KV namespace with cached directory listings
   */
  DIRECTORY_CACHE: KVNamespace;

  /**
   * Temp flag for whether or not to use KV instead of S3
   */
  USE_KV: boolean;

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
   * Sentry DSN, used for error monitoring
   * If missing, Sentry isn't used
   */
  SENTRY_DSN?: string;

  ORIGIN_HOST: string;
}
