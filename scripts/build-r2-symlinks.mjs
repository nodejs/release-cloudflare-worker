#!/usr/bin/env node
'use strict';

import { basename, dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Linker } from 'nodejs-latest-linker/common.js';
import { DOCS_DIR, ENDPOINT, PROD_BUCKET, RELEASE_DIR } from './constants.mjs';

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

const CACHED_DIRECTORIES_OUT = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'cachedDirectories.json'
);

const FILE_SYMLINKS = join(
  import.meta.dirname,
  '..',
  'src',
  'constants',
  'fileSymlinks.json'
);

if (!process.env.CF_ACCESS_KEY_ID) {
  throw new TypeError('CF_ACCESS_KEY_ID missing');
}

if (!process.env.CF_SECRET_ACCESS_KEY) {
  throw new TypeError('CF_SECRET_ACCESS_KEY missing');
}

const client = new S3Client({
  endpoint: ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
  },
});

// Cache the contents of `nodejs/docs/` so we can reference it in the worker
await writeDocsDirectoryFile(client);

// Grab all of the files & directories in `nodejs/release/`
const releases = await listDirectory(client, RELEASE_DIR);

// Create the latest version mapping with the contents of `nodejs/release/`
const latestVersions = await getLatestVersionMapping(client, releases);

// Write it so we can use it in the worker
await writeFile(LATEST_VERSIONS_OUT, JSON.stringify(latestVersions));

// Filter the latest version map so we only have the `latest-*` directories
const latestVersionDirectories = Object.keys(latestVersions)
  .filter(version => version !== 'node-latest.tar.gz')
  .map(version => `${version}/`);

// Create the complete listing of `nodejs/release/` by adding what R2 returned
//  and the latest version directories (which are the symlinks)
const releaseDirectorySubdirectories = releases.subdirectories
  .concat(latestVersionDirectories)
  .sort();

// This is the path in R2 for the latest tar archive of Node.
const nodeLatestPath = `nodejs/release/${latestVersions['node-latest.tar.gz'].replaceAll('latest', latestVersions['latest'])}`;

// Stat the file that `node-latest.tar.gz` points to so we can have accurate
//  size & last modified info for the directory listing
const nodeLatest = await headFile(client, nodeLatestPath);
if (!nodeLatest) {
  throw new TypeError(
    `node-latest.tar.gz points to ${latestVersions['node-latest.tar.gz']} which doesn't exist in the prod bucket`
  );
}

/**
 * Preprocess these directories since they have symlinks in them that don't
 *  actually exist in R2 but need to be present when we give a directory listing
 *  result
 * @type {Record<string, import('../src/providers/provider.ts').ReadDirectoryResult>}
 */
const cachedDirectories = {
  'nodejs/release/': {
    subdirectories: releaseDirectorySubdirectories,
    hasIndexHtmlFile: false,
    files: [
      ...releases.files,
      {
        name: 'node-latest.tar.gz',
        lastModified: nodeLatest.lastModified,
        size: nodeLatest.size,
      },
    ],
    lastModified: releases.lastModified,
  },
  'nodejs/docs/': {
    // We reuse the releases listing result here instead of listing the docs
    //  directory since it's more complete. The docs folder does have some actual
    //  directories in it, but most of it is symlinks and aren't present in R2.
    subdirectories: releaseDirectorySubdirectories,
    hasIndexHtmlFile: false,
    files: [],
    lastModified: releases.lastModified,
  },
};

// Some older versions of Node exist in `nodejs/release/` and have folders
//  with symlinks to them. For example, node-v0.1.100.tar.gz lives under
//  `nodejs/release/`, but there's also `nodejs/release/v0.1.100/node-v0.1.100.tar.gz`
//  which is just a symlink to it.
// Let's add these to our cached directories.
const fileSymlinks = JSON.parse(await readFile(FILE_SYMLINKS, 'utf8'));

for (const file of Object.keys(fileSymlinks)) {
  // Stat the actual file so we can get it's size, last modified
  const actualFile = await headFile(client, fileSymlinks[file]);

  const directory = `${dirname(file)}/`;

  if (directory in cachedDirectories) {
    // Directory was already cached, let's just append the file to the result
    cachedDirectories[directory].files.push({
      ...actualFile,
      name: basename(file),
    });
  } else {
    // List the directory that the symlink is in so we can append the symlink to
    //  what's actually there
    const contents = await listDirectory(client, directory);
    contents.files.push({
      ...actualFile,
      name: basename(file),
    });

    cachedDirectories[directory] = contents;
  }
}

await writeFile(CACHED_DIRECTORIES_OUT, JSON.stringify(cachedDirectories));

/**
 * @param {S3Client} client
 * @param {string} directory
 * @returns {Promise<import('../src/providers/provider.js').ReadDirectoryResult>}
 */
async function listDirectory(client, directory) {
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
          subdirectories.push(value.Prefix.substring(directory.length));
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
            name: value.Key.substring(directory.length),
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
 * @param {S3Client} client
 * @param {string} path
 * @returns {Promise<import('../src/providers/provider.js').File | undefined>}
 */
async function headFile(client, path) {
  const data = await client.send(
    new HeadObjectCommand({
      Bucket: PROD_BUCKET,
      Key: path,
    })
  );

  if (!data.LastModified || !data.ContentLength) {
    return undefined;
  }

  return {
    name: path,
    lastModified: data.LastModified,
    size: data.ContentLength,
  };
}

/**
 * @param {S3Client} client
 */
async function writeDocsDirectoryFile(client) {
  // Grab all of the directories in `nodejs/docs/`
  const docs = await listDirectory(client, DOCS_DIR);

  // Cache the contents of `nodejs/docs/` so we can refer to it in the worker w/o
  //  making a call to R2.
  await writeFile(
    DOCS_DIRECTORY_OUT,
    JSON.stringify(
      docs.subdirectories.map(subdirectory =>
        subdirectory.substring(0, subdirectory.length - 1)
      )
    )
  );
}

/**
 * @param {S3Client} client
 * @param {import('../src/providers/provider.js').ReadDirectoryResult} releases
 * @returns {Promise<Record<string, string>>}
 */
async function getLatestVersionMapping(client, releases) {
  const linker = new Linker({ baseDir: RELEASE_DIR, docs: DOCS_DIR });

  /**
   * Creates mappings to the latest versions of Node
   * @type {Map<string, string>}
   * @example { 'nodejs/release/latest-v20.x': 'nodejs/release/v20.x.x' }
   */
  const links = await linker.getLinks(
    [...releases.subdirectories, ...releases.files.map(file => file.name)],
    async directory => {
      const { subdirectories, files } = await listDirectory(
        client,
        `${directory}/`
      );
      return [...subdirectories, ...files.map(file => file.name)];
    }
  );

  /**
   * @type {Record<string, string>}
   * @example {'latest-v20.x': 'v20.x.x'}
   */
  const latestVersions = {};

  for (const [key, value] of links) {
    const trimmedKey = key.substring(RELEASE_DIR.length);
    const trimmedValue = value.substring(RELEASE_DIR.length);

    latestVersions[trimmedKey] = trimmedValue;
  }

  return latestVersions;
}
