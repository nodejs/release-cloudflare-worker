// @ts-check
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import Cloudflare from 'cloudflare';
import { Linker } from 'nodejs-latest-linker/common.js';
import {
  CF_ACCOUNT_TAG,
  DOCS_DIR,
  KV_RETRY_COUNT,
  PROD_BUCKET,
  R2_ENDPOINT,
  RELEASE_DIR,
} from './constants.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

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
  const subdirectories = [];

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
      console.log('yes');
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
    subdirectories: Array.from(files),
    hasIndexHtmlFile,
    files: Array.from(files),
    lastModified,
  };
}

/**
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} path
 * @param {DirectoryListMapping} [directories=undefined]
 * @returns {Promise<import('../src/providers/provider.js').File | undefined>}
 */
export async function headR2File(
  client,
  bucket,
  path,
  directories = undefined
) {
  // TODO check if it's in a cached directory already
  // const directoryName = dirname(path);
  // const cachedDirectory = directories.get(directoryName);
  // if (cachedDirectory) {
  //   const file = cachedDirectory.files.find((file) => file.name === )
  // }

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
 * @param {string} bucket
 * @param {import('../src/providers/provider.js').ReadDirectoryResult} releases
 * @param {DirectoryListMapping} cachedDirectories
 * @returns {Promise<LatestVersionMapping>}
 */
export async function getLatestVersionMapping(
  client,
  bucket,
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
        (await listR2Directory(client, bucket, r2Path));

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
 * The release and docs directories need some special processing
 *
 * @param {S3Client} client
 * @param {DirectoryListMapping} directories
 * @param {LatestVersionMapping} latestVersions
 */
export async function handleReleaseDirectory(
  client,
  directories,
  latestVersions
) {
  const releaseDirectory = directories.get(RELEASE_DIR);
  if (!releaseDirectory) {
    return;
  }

  // This is the path in R2 for the latest tar archive of Node.
  const nodeLatestPath = `nodejs/release/${latestVersions['node-latest.tar.gz'].replaceAll('latest', latestVersions['latest'])}`;

  // Stat the file that `node-latest.tar.gz` points to so we can have accurate
  //  size & last modified info for the directory listing
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

  // Add `latest-*` symlinks to the release subdirectories
  releaseDirectory.subdirectories.concat(
    Object.keys(latestVersions)
      .filter(version => version !== 'node-latest.tar.gz')
      .map(version => `${version}/`)
  );

  const docsDirectory = directories.get(DOCS_DIR);
  if (docsDirectory) {
    // TODO try treating these like symlinks
    // `vX.X.X/` and `latest-X/` directories
    const versionDirectories = releaseDirectory.subdirectories.filter(
      subdirectory =>
        subdirectory.startsWith('v') || subdirectory.startsWith('latest-')
    );

    docsDirectory.subdirectories = Array.from(
      new Set([...docsDirectory.subdirectories, ...versionDirectories])
    ).sort();
  }
}

/**
 * Some older versions of Node exist in `nodejs/release/` and have folders with
 * symlinks to them. For example, `node-v0.1.100.tar.gz` lives in
 * `nodejs/release`, but there's also `nodejs/release/v0.1.100/node-v0.1.100.tar.gz`
 * which is just a symlink to it.
 *
 * @param {S3Client} client
 * @param {DirectoryListMapping} directories
 * @param {string} latestVersion
 */
export async function addSymlinksToDirectoryCache(
  client,
  directories,
  latestVersion
) {
  const fileSymlinksPath = join(
    import.meta.dirname,
    '..',
    'src',
    'constants',
    'fileSymlinks.json'
  );

  const fileSymlinks = JSON.parse(await readFile(fileSymlinksPath, 'utf8'));

  // Delete this for now, we'll add it back again later
  delete fileSymlinks['node-config-schema.json'];

  for (const symlink of Object.keys(fileSymlinks)) {
    console.log(`Mapping symlink: '${symlink}' -> '${fileSymlinks[symlink]}'`);

    // Stat the source file so we can get its size, last modified
    const sourceFile = await headR2File(
      client,
      PROD_BUCKET,
      fileSymlinks[symlink],
      directories
    );

    if (!sourceFile) {
      throw new TypeError(
        `symlink '${symlink}' points to invalid file '${sourceFile}'`
      );
    }

    const directoryPath = `${dirname(symlink)}/`;

    let directory = directories.get(directoryPath);
    if (!directory) {
      directory = await listR2Directory(client, PROD_BUCKET, directoryPath);
      directories.set(directoryPath, directory);
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
  await writeFile(fileSymlinksPath, JSON.stringify(fileSymlinks));
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
    account_id: CF_ACCOUNT_TAG,
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
      account_id: CF_ACCOUNT_TAG,
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
      account_id: CF_ACCOUNT_TAG,
      body: batch,
    });
  }
}
