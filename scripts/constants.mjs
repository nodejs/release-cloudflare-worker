'use strict';

export const ENDPOINT =
  process.env.ENDPOINT ??
  'https://07be8d2fbc940503ca1be344714cb0d1.r2.cloudflarestorage.com';

export const PROD_BUCKET = process.env.PROD_BUCKET ?? 'dist-prod';

export const STAGING_BUCKET = process.env.STAGING_BUCKET ?? 'dist-staging';

export const R2_RETRY_COUNT = 3;
