/**
 * Max amount of retries for requests to R2
 */
export const R2_RETRY_LIMIT = 5;

/**
 * Max amount of retries for requests to KV
 */
export const KV_RETRY_LIMIT = 5;

/**
 * Max amount of keys to be returned in a S3 request
 */
export const S3_MAX_KEYS = 1000;

/**
 * Max amount of keys we can have in a KV request
 */
export const KV_MAX_KEYS = 10_000;
