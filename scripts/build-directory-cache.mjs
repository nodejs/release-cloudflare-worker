#!/usr/bin/env node
// @ts-check
'use strict';

import { join } from 'node:path';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PROD_BUCKET, R2_ENDPOINT } from './constants.mjs';
import { writeFile } from 'node:fs/promises';

const DOCS_DIRECTORY_OUT = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'docsDirectory.json'
);

const LATEST_VERSIONS_OUT = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'latestVersions.json'
);

const FILE_SYMLINKS = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'fileSymlinks.json'
);

// Ensure all necessary environment variables are set
for (const envVar of [
  // 'CLOUDFLARE_API_TOKEN',
  'CF_ACCESS_KEY_ID',
  'CF_SECRET_ACCESS_KEY',
]) {
  if (!process.env[envVar]) {
    throw new TypeError(`${envVar} missing`);
  }
}

const client = new S3Client({
  endpoint: R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
  },
});

// List all contents of R2
const bucketContents = await listDirectory(client)

await writeFile('asd.json', JSON.stringify(bucketContents, null, 2))

// 

/**
 * List the contents of a directory in R2
 * 
 * @param {S3Client} client
 * @param {string | undefined} directory
 * @returns {Promise<import('../src/providers/provider.js').ReadDirectoryResult>}
 */
async function listDirectory(client, directory = undefined) {
  /**
   * @type {Array<string>}
   */
  const subdirectories = [];

  /**
   * @type {Array<import('../src/providers/provider.js').File>}
   */
  const files = [];

  let hasIndexHtmlFile = false;

  let truncated = true;
  let continuationToken;
  let lastModified = new Date(0);
  while (truncated) {
    const data = await client.send(
      new ListObjectsV2Command({
        Bucket: PROD_BUCKET,
        Delimiter: '/',
        Prefix: directory,
        ContinuationToken: continuationToken,
      })
    );

    if (data.CommonPrefixes) {
      data.CommonPrefixes.forEach(value => {
        if (value.Prefix) {
          subdirectories.push(value.Prefix.substring(directory?.length ?? 0));
        }
      });
    }

    if (data.Contents) {
      data.Contents.forEach(value => {
        if (value.Key) {
          if (value.Key.match(/index.htm(?:l)$/)) {
            hasIndexHtmlFile = true;
          }

          files.push({
            name: value.Key.substring(directory?.length ?? 0),
            lastModified: value.LastModified,
            size: value.Size,
          });

          if (value.LastModified > lastModified) {
            lastModified = value.LastModified;
          }
        }
      });
    }

    truncated = data.IsTruncated;
    continuationToken = data.NextContinuationToken;
  }

  return { subdirectories, hasIndexHtmlFile, files, lastModified };
}

/**
 * @typedef {{
 *   key: string,
 *   value: string
 * }} KvValue
 * 
 * @see https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/methods/bulk_update/
 * 
 * @param {Array<KvValue>} values 
 */
async function writeKeysToKv(values) {

}

/**
 * Delete all elements in a KV namespace
 */
async function purgeKvNamespace() {

}
