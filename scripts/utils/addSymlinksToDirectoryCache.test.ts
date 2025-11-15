import { describe, expect, test, vi } from 'vitest';
import { type HeadObjectCommand } from '@aws-sdk/client-s3';
import {
  DOCS_DIRECTORY_PATH,
  PROD_BUCKET,
  RELEASE_DIR,
} from '../constants.mjs';
import { ReadDirectoryResult } from '../../src/providers/provider';
import {
  addLatestDirectorySymlinksToCache,
  addLatestTarSymlinkToCache,
  addVersionSymlinksToCachedDocsDirectory,
} from './addSymlinksToDirectoryCache.mjs';
import { LatestVersionMapping } from './getLatestVersionMapping.mjs';

describe('addLatestTarSymlinkToCache', () => {
  test('adds `node-latest.tar.gz` to release directory', async () => {
    const now = new Date();
    const fileSize = 67;

    const client = {
      async send(cmd: HeadObjectCommand) {
        expect(cmd.input.Bucket).toStrictEqual(PROD_BUCKET);
        expect(cmd.input.Key).toStrictEqual(
          `${RELEASE_DIR}v20.0.0/node-v20.0.0.tar.gz`
        );

        return {
          LastModified: now,
          ContentLength: fileSize,
        };
      },
    };

    const releaseDirectory: ReadDirectoryResult = {
      subdirectories: [],
      hasIndexHtmlFile: false,
      files: [],
      lastModified: new Date(),
    };

    await addLatestTarSymlinkToCache(
      // @ts-expect-error don't need full s3 client here
      client,
      releaseDirectory,
      {
        'node-latest.tar.gz': 'latest/node-v20.0.0.tar.gz',
      },
      'v20.0.0'
    );

    expect(releaseDirectory.files).toContainEqual({
      name: 'node-latest.tar.gz',
      lastModified: now,
      size: fileSize,
    });
  });

  test("throws error if latest node tar doesn't exist", async () => {
    const client = {
      async send() {
        return {};
      },
    };

    const releaseDirectory: ReadDirectoryResult = {
      subdirectories: [],
      hasIndexHtmlFile: false,
      files: [],
      lastModified: new Date(),
    };

    const result = addLatestTarSymlinkToCache(
      // @ts-expect-error don't need full s3 client here
      client,
      releaseDirectory,
      {
        'node-latest.tar.gz': 'latest/node-v20.0.0.tar.gz',
      },
      'v20.0.0'
    );

    await expect(result).rejects.toThrowError();
  });
});

test('addLatestDirectorySymlinksToCache', () => {
  const now = new Date();

  const releaseDirectory: ReadDirectoryResult = {
    subdirectories: ['v20.1.2/', 'v22.2.1/', 'v19.0.0/'],
    hasIndexHtmlFile: false,
    files: [],
    lastModified: now,
  };

  const latestVersionMap: LatestVersionMapping = {
    'latest-v20.x': 'v20.1.2',
    'latest-v22.x': 'v22.2.1',
    'node-latest.tar.gz': 'latest/node-v22.2.1',
  };

  addLatestDirectorySymlinksToCache(releaseDirectory, latestVersionMap);

  expect(releaseDirectory).toStrictEqual({
    subdirectories: [
      'latest-v20.x/',
      'latest-v22.x/',
      'v19.0.0/',
      'v20.1.2/',
      'v22.2.1/',
    ],
    hasIndexHtmlFile: false,
    files: [],
    lastModified: now,
  });
});

test('addVersionSymlinksToCachedDocsDirectory', async () => {
  const now = new Date();

  const releaseDirectory: ReadDirectoryResult = {
    subdirectories: [
      'latest-v20.x/',
      'latest-v22.x/',
      'v19.0.0/',
      'v20.1.2/',
      'v22.2.1/',
      'npm/',
    ],
    hasIndexHtmlFile: false,
    files: [
      {
        name: 'index.json',
        lastModified: now,
        size: 1,
      },
    ],
    lastModified: now,
  };

  const docsDirectory: ReadDirectoryResult = {
    subdirectories: ['v0.0.1/'],
    hasIndexHtmlFile: false,
    files: [],
    lastModified: now,
  };

  vi.mock('node:fs/promises', async importOriginal => {
    const original = await importOriginal();

    return {
      // @ts-expect-error
      ...original,
      writeFile: async (file: string, data: string) => {
        expect(file).toStrictEqual(DOCS_DIRECTORY_PATH);
        expect(JSON.parse(data)).toStrictEqual(['v0.0.1']);
      },
    };
  });

  await addVersionSymlinksToCachedDocsDirectory(
    releaseDirectory,
    docsDirectory
  );

  expect(docsDirectory).toStrictEqual({
    subdirectories: [
      'latest-v20.x/',
      'latest-v22.x/',
      'v0.0.1/',
      'v19.0.0/',
      'v20.1.2/',
      'v22.2.1/',
    ],
    hasIndexHtmlFile: false,
    files: [],
    lastModified: now,
  });
});
