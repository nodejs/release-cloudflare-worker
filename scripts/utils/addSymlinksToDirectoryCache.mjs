import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import {
  DOCS_DIR,
  NODE_LATEST_FILE_NAME,
  PROD_BUCKET,
  RELEASE_DIR,
  STATIC_FILE_SYMLINKS_PATH,
} from '../constants.mjs';
import { headR2File } from './r2.mjs';
import { CACHED_DIRECTORIES_PATH, DOCS_DIRECTORY_PATH } from '../constants.mjs';
import { listR2Directory } from '../../common/listR2Directory.mjs';

/**
 * Adds the `nodejs/release/node-latest.tar.gz` symlink to the directory cache
 * @param {S3Client} client
 * @param {import('../../src/providers/provider').ReadDirectoryResult} releaseDirectory
 * @param {import('./getLatestVersionMapping.mjs').LatestVersionMapping} latestVersionMap
 * @param {string} latestVersion
 */
export async function addLatestTarSymlinkToCache(
  client,
  releaseDirectory,
  latestVersionMap,
  latestVersion
) {
  const nodeLatestPath = `${RELEASE_DIR}${latestVersionMap[NODE_LATEST_FILE_NAME].replaceAll('latest', latestVersion)}`;

  // Stat the file that `node-latest.tar.gz` points to so we can have accurate
  // size & last modified info for the directory listing. Also acts as a safety
  // check so this doesn't point to an invalid path without us noticing.
  const nodeLatest = await headR2File(client, PROD_BUCKET, nodeLatestPath);
  if (!nodeLatest) {
    throw new TypeError(
      `couldn't map node-latest.tar.gz: path '${nodeLatestPath}' doesn't exist in the '${PROD_BUCKET}'`
    );
  }

  releaseDirectory.files.push({
    name: NODE_LATEST_FILE_NAME,
    lastModified: nodeLatest.lastModified,
    size: nodeLatest.size,
  });
}

/**
 * Adds the `latest-*` directory symlinks to the directory cache
 * @param {import('../../src/providers/provider').ReadDirectoryResult} releaseDirectory
 * @param {import('./getLatestVersionMapping.mjs').LatestVersionMapping} latestVersionMap
 */
export function addLatestDirectorySymlinksToCache(
  releaseDirectory,
  latestVersionMap
) {
  releaseDirectory.subdirectories.push(
    ...Object.keys(latestVersionMap)
      // We only want directories, remove the only file in the map
      .filter(version => version !== NODE_LATEST_FILE_NAME)
      .map(version => `${version}/`)
  );
  releaseDirectory.subdirectories.sort();
}

/**
 * Manually override the contents of `nodejs/docs` to be a union of what's
 * actually in that directory as well as the versions present in
 * `nodejs/release/`.
 * @param {import('../../src/providers/provider').ReadDirectoryResult} releaseDirectory
 * @param {import('../../src/providers/provider').ReadDirectoryResult | undefined} docsDirectory
 */
export async function addVersionSymlinksToCachedDocsDirectory(
  releaseDirectory,
  docsDirectory
) {
  if (!docsDirectory) {
    return;
  }

  // Cache the current contents of the directory so we know which directories
  // actually exist and which are symlinks
  // TODO: look into a better/more general way of handling this
  await writeFile(
    DOCS_DIRECTORY_PATH,
    JSON.stringify(
      docsDirectory.subdirectories.map(subdirectory =>
        // Trim trailing `/`
        subdirectory.substring(0, subdirectory.length - 1)
      ),
      null,
      2
    )
  );

  // We only want the `vX.X.X/` and `latest-X/` directories
  const versionDirectories = releaseDirectory.subdirectories.filter(
    subdirectory =>
      subdirectory.startsWith('v') || subdirectory.startsWith('latest')
  );

  docsDirectory.subdirectories = Array.from(
    new Set([...docsDirectory.subdirectories, ...versionDirectories])
  ).sort();
}

/**
 * Add the static file symlinks to the directory cache
 * @param {S3Client} client
 * @param {import('./r2.mjs').DirectoryListMapping} cachedDirectories
 * @param {string} latestVersion
 */
export async function addStaticFileSymlinksToCache(
  client,
  cachedDirectories,
  latestVersion
) {
  // Keep list of directories we modify here to include in cachedDirectories.json
  // TODO: remove when KV is considered stable
  const directoriesIncludedInFileCache = new Set([RELEASE_DIR, DOCS_DIR]);

  const fileSymlinksFile = await readFile(STATIC_FILE_SYMLINKS_PATH, 'utf8');

  /**
   * @type {Record<string, string>}
   */
  const fileSymlinks = JSON.parse(fileSymlinksFile);

  // This file is an exception for two reasons:
  //  1. It's dynamic and points to the latest Node version
  //  2. It's handled specially and is technically in the root directory,
  //     which we should never be listing thus don't need to add it to the
  //     directory cache.
  // So, let's remove it then add it back once we're done handling the rest of
  // the static file symlinks.
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
    directoriesIncludedInFileCache.add(directoryPath);

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

  // Update the cached directories file
  // TODO: remove when KV is considered stable
  const fileContents = {};
  directoriesIncludedInFileCache.forEach(directory => {
    fileContents[directory] = cachedDirectories.get(directory);
  });

  await writeFile(
    CACHED_DIRECTORIES_PATH,
    JSON.stringify(fileContents, null, 2)
  );
}

/**
 * R2 doesn't have symlinks, but we make heavy use of them. So, we need to add
 * them into the cache ourselves.
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
 * @param {import('./r2.mjs').DirectoryListMapping} cachedDirectories
 * @param {import('./getLatestVersionMapping.mjs').LatestVersionMapping} latestVersionMap
 */
export async function addSymlinksToDirectoryCache(
  client,
  cachedDirectories,
  latestVersionMap
) {
  const releaseDirectory = cachedDirectories.get(RELEASE_DIR);
  if (!releaseDirectory) {
    console.warn(`Release directory not found at path ${RELEASE_DIR}`);
    return;
  }

  const latestVersion = latestVersionMap['latest'];

  await addLatestTarSymlinkToCache(
    client,
    releaseDirectory,
    latestVersionMap,
    latestVersion
  );

  addLatestDirectorySymlinksToCache(releaseDirectory, latestVersionMap);

  await addVersionSymlinksToCachedDocsDirectory(
    releaseDirectory,
    cachedDirectories.get(DOCS_DIR)
  );

  await addStaticFileSymlinksToCache(client, cachedDirectories, latestVersion);
}
