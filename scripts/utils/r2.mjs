import { dirname } from 'node:path';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { R2_ENDPOINT } from '../constants.mjs';
import { listR2Directory } from '../../common/listR2Directory.mjs';

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

/**
 * Recursively list the contents of an R2 bucket under
 *
 * @typedef {Map<string, import('../../src/providers/provider.js').ReadDirectoryResult>} DirectoryListMapping
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
        `${directory ?? ''}${subdirectory}`,
        listings
      )
    )
  );

  return listings;
}

/**
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} path
 * @param {DirectoryListMapping} [cachedDirectories=undefined]
 * @returns {Promise<import('../../src/providers/provider.js').File | undefined>}
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
