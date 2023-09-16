#!/usr/bin/env node

/**
 * Tells the worker to purge the cache for whichever paths
 *  just got uploaded
 * Usage: aws s3 sync ... | ./cache-purge.js <bucket name>
 */

const readline = require('readline');
const path = require('path');

if (process.env.DIST_WORKER_API_KEY === undefined) {
  console.log(
    'Skipping cache purge, no DIST_WORKER_API_KEY environment variable'
  );
  return;
}

const endpoint =
  process.env.CACHE_PURGE_ENDPOINT ?? 'https://nodejs.org/_cf/cache-purge';
const bucketName = process.argv[2];
if (bucketName === undefined) {
  console.error('Bucket name undefined');
  return;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const pathsToPurge = new Array();
rl.on('line', line => {
  console.log(line);
  if (!line.startsWith('upload:')) {
    return;
  }

  // upload: dist\testing\asd.txt to s3://node-poc-dev/testing/asd.txt
  const s3Path = line.substring(line.indexOf('s3://')); // s3://node-poc-dev/testing/asd.txt
  const fileName = s3Path.substring(bucketName.length + 6); // testing/asd.txt

  pathsToPurge.push(fileName);

  const directoryName = path.dirname(fileName);
  if (
    !['', '.', './'].includes(directoryName) &&
    !pathsToPurge.includes(directoryName)
  ) {
    pathsToPurge.push(directoryName);
    pathsToPurge.push(directoryName + '/');
  }
});
rl.on('close', () => {
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.DIST_WORKER_API_KEY,
    },
    body: JSON.stringify({
      paths: pathsToPurge,
    }),
  }).then(res => {
    if (!res.ok) {
      console.error(`Failed purging paths, got ${res.status}`);
      return;
    }
    console.log(`Purged ${pathsToPurge.length} paths`);
  });
});
