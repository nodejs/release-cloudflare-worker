import { S3Client } from '@aws-sdk/client-s3';
import { Linker } from 'nodejs-latest-linker/common.js';
import {
  DOCS_DIR,
  LATEST_VERSIONS_MAPPING_PATH,
  PROD_BUCKET,
  RELEASE_DIR,
} from '../constants.mjs';
import { writeFile } from 'node:fs/promises';
import { listR2Directory } from '../../common/listR2Directory.mjs';

/**
 * @typedef {Record<string, string>} LatestVersionMapping
 *
 * @param {S3Client} client
 * @param {import('../../src/providers/provider.js').ReadDirectoryResult} releases
 * @param {import('./r2.mjs').DirectoryListMapping} cachedDirectories
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

  // Update the constants file
  await writeFile(
    LATEST_VERSIONS_MAPPING_PATH,
    JSON.stringify(latestVersions, null, 2)
  );

  return latestVersions;
}
