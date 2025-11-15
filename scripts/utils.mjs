// @ts-check
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import Cloudflare from 'cloudflare';
import { Linker } from 'nodejs-latest-linker/common.js';
import {
  CLOUDFLARE_ACCOUNT_ID,
  DOCS_DIR,
  KV_RETRY_COUNT,
  PROD_BUCKET,
  R2_ENDPOINT,
  R2_RETRY_COUNT,
  RELEASE_DIR,
  STATIC_FILE_SYMLINKS_PATH,
} from './constants.mjs';

/**
 * @param {string} accessKeyId
 * @param {string} secretAccessKey
 * @returns {S3Client}
 */
export function createS3Client(accessKeyId, secretAccessKey) {
  return new S3Client({
    endpoint: R2_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

export function createCloudflareClient() {
  return new Cloudflare({
    maxRetries: KV_RETRY_COUNT,
  });
}

/**
 * Recursively list the contents of an R2 bucket under
 *
 * @typedef {Map<string, import('../src/providers/provider.js').ReadDirectoryResult>} DirectoryListMapping
 *
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string | undefined} [directory]
 * @param {DirectoryListMapping} [listings]
 * @returns {Promise<DirectoryListMapping>}
 */
export async function listR2DirectoryRecursive(
  client,
  bucket,
  directory = undefined,
  listings = new Map()
) {
  // List the current directory
  const response = await listR2Directory(client, bucket, directory);

  // Add current directory to the listings object
  listings.set(directory ?? '/', response);

  // List the subdirectories
  await Promise.all(
    response.subdirectories.map(subdirectory =>
      listR2DirectoryRecursive(
        client,
        bucket,
        `${directory ? directory : ''}${subdirectory}`,
        listings
      )
    )
  );

  return listings;
}

/**
 * List the contents of a directory in R2
 *
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string | undefined} directory
 * @returns {Promise<import('../src/providers/provider.js').ReadDirectoryResult>}
 */
export async function listR2Directory(client, bucket, directory = undefined) {
  /**
   * @type {Set<string>}
   */
  const subdirectories = new Set();

  /**
   * @type {Set<import('../src/providers/provider.js').File>}
   */
  const files = new Set();

  let hasIndexHtmlFile = false;

  let truncated = true;
  let continuationToken;
  let lastModified = new Date(0);
  while (truncated) {
    /**
     * @type {import('@aws-sdk/client-s3').ListObjectsV2Output | undefined}
     */
    let data = undefined;

    let retries = R2_RETRY_COUNT;
    while (retries) {
      try {
        data = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Delimiter: '/',
            Prefix: directory,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
          })
        );

        break;
      } catch (err) {
        console.warn('listR2Directory listing error: ', err);
        retries--;

        if (retries === 0) {
          console.log('exhausted R2 retries');
          throw err;
        }
      }
    }

    if (!data) {
      // Should never reach this
      throw new TypeError('expected listing response to be defined');
    }

    if (data.CommonPrefixes) {
      data.CommonPrefixes.forEach(value => {
        if (value.Prefix) {
          subdirectories.add(value.Prefix.substring(directory?.length ?? 0));
        }
      });
    }

    if (data.Contents) {
      data.Contents.forEach(value => {
        if (value.Key) {
          if (value.Key.match(/index.htm(?:l)$/)) {
            hasIndexHtmlFile = true;
          }

          files.add({
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

  return {
    subdirectories: Array.from(subdirectories),
    hasIndexHtmlFile,
    files: Array.from(files),
    lastModified,
  };
}

/**
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} path
 * @param {DirectoryListMapping} [cachedDirectories=undefined]
 * @returns {Promise<import('../src/providers/provider.js').File | undefined>}
 */
export async function headR2File(
  client,
  bucket,
  path,
  cachedDirectories = undefined
) {
  const directoryName = `${dirname(path)}/`;
  const cachedDirectory = cachedDirectories?.get(directoryName);
  if (cachedDirectory) {
    const fileName = path.substring(directoryName.length);

    return cachedDirectory.files.find(file => file.name === fileName);
  }

  const data = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
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
 * @typedef {Record<string, string>} LatestVersionMapping
 *
 * @param {S3Client} client
 * @param {import('../src/providers/provider.js').ReadDirectoryResult} releases
 * @param {DirectoryListMapping} cachedDirectories
 * @returns {Promise<LatestVersionMapping>}
 */
export async function getLatestVersionMapping(
  client,
  releases,
  cachedDirectories
) {
  const linker = new Linker({ baseDir: RELEASE_DIR, docs: DOCS_DIR });

  /**
   * Creates mappings to the latest versions of Node
   * @type {Map<string, string>}
   * @example { 'nodejs/release/latest-v20.x': 'nodejs/release/v20.x.x' }
   */
  const links = await linker.getLinks(
    [...releases.subdirectories, ...releases.files.map(file => file.name)],
    async directory => {
      const r2Path = `${directory}/`;

      const listing =
        cachedDirectories.get(r2Path) ??
        (await listR2Directory(client, PROD_BUCKET, r2Path));

      return [
        ...listing.subdirectories,
        ...listing.files.map(file => file.name),
      ];
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

/**
 * R2 doesn't have symlinks, but we make heavy use of them. This means we need
 * to add them into the cache ourselves.
 *
 * We use symlinks to point to both files and directories.
 *
 * The file symlinks are more or less static. There are only two that are
 * constantly updated with each release:
 *  - `nodejs/release/node-latest.tar.gz`
 *  - `node-config-schema.json`
 *
 * The directory symlinks are dynamic with a few exceptions for a select number
 * of directories in `nodejs/docs/`
 *
 * @param {S3Client} client
 * @param {DirectoryListMapping} cachedDirectories
 * @param {LatestVersionMapping} latestVersions
 */
export async function addSymlinksToDirectoryCache(
  client,
  cachedDirectories,
  latestVersions
) {
  const releaseDirectory = cachedDirectories.get(RELEASE_DIR);
  if (!releaseDirectory) {
    console.warn(`Release directory not found at path ${RELEASE_DIR}`);
    return;
  }

  const latestVersion = latestVersions['latest'];

  // Add the `nodejs/release/node-latest.tar.gz` symlink to the directory cache
  {
    const nodeLatestPath = `nodejs/release/${latestVersions['node-latest.tar.gz'].replaceAll('latest', latestVersion)}`;

    // Stat the file that `node-latest.tar.gz` points to so we can have accurate
    // size & last modified info for the directory listing. Also acts as a safety
    // check so this doesn't point to an invalid path without us noticing.
    const nodeLatest = await headR2File(client, PROD_BUCKET, nodeLatestPath);
    if (!nodeLatest) {
      throw new TypeError(
        `node-latest.tar.gz points to ${latestVersions['node-latest.tar.gz']} which doesn't exist in the prod bucket`
      );
    }

    releaseDirectory.files.push({
      name: 'node-latest.tar.gz',
      lastModified: nodeLatest.lastModified,
      size: nodeLatest.size,
    });
  }

  // Add `latest-*` directory symlinks to the directory cache
  releaseDirectory.subdirectories.concat(
    Object.keys(latestVersions)
      .filter(version => version !== 'node-latest.tar.gz')
      .map(version => `${version}/`)
  );

  // Manually override the contents of `nodejs/docs` to be a union of what's
  // actually in that directory as well as the versions present in
  // `nodejs/release`.
  const docsDirectory = cachedDirectories.get(DOCS_DIR);
  if (docsDirectory) {
    // We only want the `vX.X.X/` and `latest-X/` directories
    const versionDirectories = releaseDirectory.subdirectories.filter(
      subdirectory =>
        subdirectory.startsWith('v') || subdirectory.startsWith('latest-')
    );

    docsDirectory.subdirectories = Array.from(
      new Set([...docsDirectory.subdirectories, ...versionDirectories])
    ).sort();
  }

  // Add the static file symlinks to the directory cache
  {
    /**
     * @type {Record<string, string>}
     */
    const fileSymlinks = JSON.parse(
      await readFile(STATIC_FILE_SYMLINKS_PATH, 'utf8')
    );

    // This isn't static, delete it for now
    fileSymlinks['node-config-schema.json'] = undefined;

    // Add the symlinks to the directory cache
    for (const symlink of Object.keys(fileSymlinks)) {
      const sourceFilePath = fileSymlinks[symlink];

      if (!sourceFilePath) {
        // Hit a file we don't want to stat, ignore it
        continue;
      }

      // Stat the source file so we can get its size, last modified
      const sourceFile = await headR2File(
        client,
        PROD_BUCKET,
        fileSymlinks[symlink],
        cachedDirectories
      );

      if (!sourceFile) {
        throw new TypeError(
          `symlink '${symlink}' points to invalid file '${sourceFile}'`
        );
      }

      const directoryPath = `${dirname(symlink)}/`;

      let directory = cachedDirectories.get(directoryPath);
      if (!directory) {
        directory = await listR2Directory(client, PROD_BUCKET, directoryPath);
        cachedDirectories.set(directoryPath, directory);
      }

      directory.files.push({
        ...sourceFile,
        name: basename(symlink),
      });
    }

    // Update the node-config-schema.json file symlink to point to the latest
    //  version
    fileSymlinks['node-config-schema.json'] =
      `${RELEASE_DIR}${latestVersion}/docs/node-config-schema.json`;

    // Update file so it can be used in the worker
    await writeFile(
      STATIC_FILE_SYMLINKS_PATH,
      JSON.stringify(fileSymlinks, null, 2)
    );
  }
}

/**
 * @param {Cloudflare} client
 * @param {string} namespace
 * @returns {Promise<Set<string>>}
 */
export async function listKvNamespace(client, namespace) {
  /**
   * @type {Set<string>}
   */
  const keys = new Set();

  for await (const key of client.kv.namespaces.keys.list(namespace, {
    account_id: CLOUDFLARE_ACCOUNT_ID,
  })) {
    keys.add(key.name);
  }

  return keys;
}

/**
 * @param {Cloudflare} client
 * @param {string} namespace
 * @param {Map<string, object>} values
 */
export async function writeKeysToKv(client, namespace, values) {
  const keys = values.keys().toArray();

  while (keys.length) {
    // Can only write 10,000 keys at once
    const batch = keys.splice(0, 10_000);

    await client.kv.namespaces.bulkUpdate(namespace, {
      account_id: CLOUDFLARE_ACCOUNT_ID,
      body: batch.map(key => ({
        key,
        value: JSON.stringify(values.get(key)),
      })),
    });
  }
}

/**
 * Delete keys in a KV namespace
 * @param {Cloudflare} client
 * @param {string} namespace
 * @param {Array<string>} keys
 */
export async function deleteKvNamespaceKeys(client, namespace, keys) {
  while (keys.length) {
    // Can only delete 10,000 keys at once
    const batch = keys.splice(0, 10_000);

    await client.kv.namespaces.bulkDelete(namespace, {
      account_id: CLOUDFLARE_ACCOUNT_ID,
      body: batch,
    });
  }
}
