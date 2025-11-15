import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { R2_RETRY_LIMIT, S3_MAX_KEYS } from './limits.mjs';

/**
 * List the contents of a directory in R2.
 *
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string | undefined} [directory=undefined]
 * @param {number} retryCount
 * @returns {Promise<import('../src/providers/provider.js').ReadDirectoryResult | undefined>}
 */
export async function listR2Directory(
  client,
  bucket,
  directory = undefined,
  retryCount = R2_RETRY_LIMIT
) {
  /**
   * @type {Set<string>}
   */
  const subdirectories = new Set();

  /**
   * @type {Set<import('../src/providers/provider.js').File>}
   */
  const files = new Set();

  let hasIndexHtmlFile = false;
  let directoryLastModified = new Date(0);

  let isTruncated;
  let continuationToken;
  do {
    /**
     * @type {import('@aws-sdk/client-s3').ListObjectsV2Output | undefined}
     */
    let data = undefined;

    let retriesLeft = retryCount;
    while (retriesLeft) {
      try {
        data = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Delimiter: '/',
            Prefix: directory,
            ContinuationToken: continuationToken,
            MaxKeys: S3_MAX_KEYS,
          })
        );

        break;
      } catch (err) {
        retriesLeft--;

        if (retriesLeft === 0) {
          throw new Error('exhausted R2 retries', { cause: err });
        }
      }
    }

    if (!data) {
      return undefined;
    }

    isTruncated = data.IsTruncated;
    continuationToken = data.NextContinuationToken;

    data.CommonPrefixes?.forEach(subdirectory => {
      if (subdirectory.Prefix) {
        subdirectories.add(
          subdirectory.Prefix.substring(directory?.length ?? 0)
        );
      }
    });

    data.Contents?.forEach(file => {
      if (!file.Key) {
        return;
      }

      if (!hasIndexHtmlFile && file.Key.match(/index.htm(?:l)$/)) {
        hasIndexHtmlFile = true;
      }

      files.add({
        name: file.Key.substring(directory?.length ?? 0),
        lastModified: file.LastModified,
        size: file.Size,
      });

      // Set the directory's last modified date to be the same as the most
      // recently updated file
      if (file.LastModified > directoryLastModified) {
        directoryLastModified = file.LastModified;
      }
    });
  } while (isTruncated);

  if (subdirectories.size === 0 && files.size === 0) {
    return undefined;
  }

  return {
    subdirectories: Array.from(subdirectories),
    hasIndexHtmlFile,
    files: Array.from(files),
    lastModified: directoryLastModified,
  };
}
