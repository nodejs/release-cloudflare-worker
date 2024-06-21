#!/usr/bin/env node

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Linker } from 'nodejs-latest-linker/common.js';
import { writeFile } from 'node:fs/promises';

const ENDPOINT =
  'https://07be8d2fbc940503ca1be344714cb0d1.r2.cloudflarestorage.com';
const BUCKET = 'dist-prod';
const RELEASE_DIR = 'nodejs/release/';
const DOCS_DIR = 'nodejs/docs/';

const client = new S3Client({
  endpoint: ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
  },
});

(async function main() {
  const allDirs = await listDirectory(RELEASE_DIR);
  const linker = new Linker({ baseDir: RELEASE_DIR, docsDir: DOCS_DIR });
  const allLinks = await linker.getLinks(allDirs, dir =>
    listDirectory(`${dir}/`)
  );

  const latestLinks = Array.from(allLinks).filter(link =>
    link[0].startsWith('nodejs/release')
  );
  latestLinks.forEach(link => {
    link[0] = link[0].substring('nodejs/release/'.length);
    link[1] = link[1].substring('nodejs/release/'.length);
  });

  await writeFile(
    './src/constants/latestVersions.json',
    JSON.stringify(Object.fromEntries(latestLinks), null, 2) + '\n'
  );
})();

async function listDirectory(dir) {
  let truncated = true;
  let continuationToken;
  let items = [];
  while (truncated) {
    const data = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Delimiter: '/',
        Prefix: dir,
        ContinuationToken: continuationToken,
      })
    );
    items = items.concat(data.CommonPrefixes ?? []).concat(data.Contents ?? []);
    truncated = data.IsTruncated;
    continuationToken = data.NextContinuationToken;
  }
  return items.map(d => d.Prefix ?? d.Key);
}
