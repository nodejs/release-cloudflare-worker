export interface Env {
  /**
   * Environment the worker is running in
   */
  ENVIRONMENT: 'dev' | 'staging' | 'prod';
  /**
   * R2 bucket we read from
   */
  R2_BUCKET: R2Bucket;
  /**
   * Account tag/public id of the account that the worker is deployed on
   */
  CF_ACCOUNT_ID: string;
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
   * Cache control header for files
   */
  FILE_CACHE_CONTROL: string;
  /**
   * Cache control header for directory listing
   */
  DIRECTORY_CACHE_CONTROL: string;
}
