import { test, expect } from 'vitest';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { listR2Directory } from './listR2Directory.mjs';
import { R2_RETRY_LIMIT } from './limits.mjs';

test('adds subdirectories and files properly', async () => {
  const now = new Date();

  // Add a second so we can check the directory's last modified is determined properly
  const directoryLastModified = new Date(now.getTime() + 1000);

  const client = {
    async send(cmd: ListObjectsV2Command) {
      expect(cmd.input.Bucket).toStrictEqual('dist-prod');
      expect(cmd.input.Prefix).toStrictEqual('some/directory/');

      return {
        IsTruncated: false,
        NextContinuationToken: undefined,
        CommonPrefixes: [
          { Prefix: 'some/directory/subdirectory1/' },
          { Prefix: 'some/directory/subdirectory2/' },
          { Prefix: 'some/directory/subdirectory3/' },
        ],
        Contents: [
          {
            Key: 'some/directory/file.txt',
            LastModified: now,
            Size: 1,
          },
          {
            Key: 'some/directory/file2.txt',
            LastModified: directoryLastModified,
            Size: 2,
          },
          {
            Key: 'some/directory/file3.txt',
            LastModified: now,
            Size: 3,
          },
        ],
      };
    },
  };

  // @ts-expect-error don't need full client
  const result = await listR2Directory(client, 'dist-prod', 'some/directory/');

  expect(result).toStrictEqual({
    subdirectories: ['subdirectory1/', 'subdirectory2/', 'subdirectory3/'],
    hasIndexHtmlFile: false,
    files: [
      {
        name: 'file.txt',
        lastModified: now,
        size: 1,
      },
      {
        name: 'file2.txt',
        lastModified: directoryLastModified,
        size: 2,
      },
      {
        name: 'file3.txt',
        lastModified: now,
        size: 3,
      },
    ],
    lastModified: directoryLastModified,
  });
});

test('handles truncation properly', async () => {
  const now = new Date();

  const client = {
    async send(cmd: ListObjectsV2Command) {
      expect(cmd.input.Bucket).toStrictEqual('dist-prod');
      expect(cmd.input.Prefix).toStrictEqual('some/directory/');

      switch (cmd.input.ContinuationToken) {
        case undefined: {
          return {
            IsTruncated: true,
            NextContinuationToken: '1',
            CommonPrefixes: [{ Prefix: 'some/directory/subdirectory1/' }],
            Contents: [
              {
                Key: 'some/directory/file.txt',
                LastModified: now,
                Size: 1,
              },
            ],
          };
        }
        case '1': {
          return {
            IsTruncated: true,
            NextContinuationToken: '2',
            CommonPrefixes: [{ Prefix: 'some/directory/subdirectory2/' }],
            Contents: [
              {
                Key: 'some/directory/file2.txt',
                LastModified: now,
                Size: 2,
              },
            ],
          };
        }
        case '2': {
          return {
            IsTruncated: false,
            NextContinuationToken: undefined,
            CommonPrefixes: [{ Prefix: 'some/directory/subdirectory3/' }],
            Contents: [
              {
                Key: 'some/directory/file3.txt',
                LastModified: now,
                Size: 3,
              },
            ],
          };
        }
      }
    },
  };

  // @ts-expect-error don't need full client
  const result = await listR2Directory(client, 'dist-prod', 'some/directory/');

  expect(result).toStrictEqual({
    subdirectories: ['subdirectory1/', 'subdirectory2/', 'subdirectory3/'],
    hasIndexHtmlFile: false,
    files: [
      {
        name: 'file.txt',
        lastModified: now,
        size: 1,
      },
      {
        name: 'file2.txt',
        lastModified: now,
        size: 2,
      },
      {
        name: 'file3.txt',
        lastModified: now,
        size: 3,
      },
    ],
    lastModified: now,
  });
});

test('retries properly', async () => {
  let retries = R2_RETRY_LIMIT;

  let requestsSent = 0;
  const client = {
    async send() {
      requestsSent++;

      throw new TypeError('dummy');
    },
  };

  const result = listR2Directory(
    // @ts-expect-error don't need full client
    client,
    'dist-prod',
    'some/directory/',
    retries
  );

  await expect(result).rejects.toThrow('exhausted R2 retries');
  expect(requestsSent).toBe(retries);
});
