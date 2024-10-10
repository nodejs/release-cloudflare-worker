#!/usr/bin/env node

/**
 * Usage: `promote-release <prefix in dist-staging to promote>`
 *  ex/ `promote-release nodejs/release/v20.0.0`
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import {
  ENDPOINT,
  PROD_BUCKET,
  STAGING_BUCKET,
  R2_RETRY_COUNT,
} from './constants.mjs';

if (process.argv.length !== 3) {
  console.error(`usage: promote-release <prefix in dist-staging to promote>`);
  process.exit(1);
}

if (!process.env.CF_ACCESS_KEY_ID) {
  console.error('CF_ACCESS_KEY_ID missing');
  process.exit(1);
}

if (!process.env.CF_SECRET_ACCESS_KEY) {
  console.error('CF_SECRET_ACCESS_KEY missing');
  process.exit(1);
}

const client = new S3Client({
  endpoint: ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
  },
});

const path = process.argv[2];
const files = await getFilesToPromote(path);

for (const file of files) {
  await promoteFile(file);
}

/**
 * @param {string} path
 * @returns {string[]}
 */
async function getFilesToPromote(path) {
  let paths = [];

  let truncated = true;
  let continuationToken;
  while (truncated) {
    const data = await retryWrapper(async () => {
      return await client.send(
        new ListObjectsV2Command({
          Bucket: STAGING_BUCKET,
          Delimiter: '/',
          Prefix: path,
          ContinuationToken: continuationToken,
        })
      );
    });

    if (data.CommonPrefixes) {
      for (const directory of data.CommonPrefixes) {
        paths.push(...(await getFilesToPromote(directory.Prefix)));
      }
    }

    if (data.Contents) {
      for (const object of data.Contents) {
        paths.push(object.Key);
      }
    }

    truncated = data.IsTruncated ?? false;
    continuationToken = data.NextContinuationToken;
  }

  return paths;
}

/**
 * @param {string} file
 */
async function promoteFile(file) {
  console.log(`Promoting ${file}`);

  await retryWrapper(async () => {
    return await client.send(
      new CopyObjectCommand({
        Bucket: PROD_BUCKET,
        CopySource: `${STAGING_BUCKET}/${file}`,
        Key: file,
      })
    );
  }, R2_RETRY_COUNT);
}

/**
 * @param {() => Promise<T>} request
 * @returns {Promise<T>}
 */
async function retryWrapper(request, retryLimit) {
  let r2Error;

  for (let i = 0; i < R2_RETRY_COUNT; i++) {
    try {
      const result = await request();
      return result;
    } catch (err) {
      r2Error = err;
      process.emitWarning(`error when contacting r2: ${err}`);
    }
  }

  throw r2Error;
}
