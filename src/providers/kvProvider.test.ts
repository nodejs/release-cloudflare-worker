import { describe, expect, test } from 'vitest';
import { KvProvider } from './kvProvider';
import type { Context } from '../context';
import type { R2Provider } from './r2Provider';
import type { ReadDirectoryResult } from './provider';
import { KV_CACHE_TTL } from '../constants/cache';

describe('readDirectory', () => {
  test('returns expected response when a directory exists', async () => {
    let directoryCacheInvoked = false;
    const ctx: Context = {
      env: {
        DIRECTORY_CACHE: {
          // @ts-expect-error don't need actual type info here
          async get(path: string): Promise<object | null> {
            directoryCacheInvoked = true;
            expect(path).toStrictEqual('some/directory/path/');

            return {
              subdirectories: [
                'subdirectory1/',
                'subdirectory2/',
                'subdirectory3/',
              ],
              hasIndexHtmlFile: false,
              files: [
                {
                  name: 'file1.txt',
                  lastModified: '2024-11-04T16:21:30.218Z',
                  size: 123,
                },
                {
                  name: 'file2.txt',
                  lastModified: '2024-11-04T16:21:30.218Z',
                  size: 321,
                },
                {
                  name: 'file3.txt',
                  lastModified: '2024-11-04T16:21:30.218Z',
                  size: 456,
                },
              ],
              lastModified: '2024-11-04T16:21:30.218Z',
            };
          },
        },
      },
    };

    const kvProvider = new KvProvider(ctx, undefined);

    expect(
      await kvProvider.readDirectory('some/directory/path/')
    ).toStrictEqual({
      subdirectories: ['subdirectory1/', 'subdirectory2/', 'subdirectory3/'],
      hasIndexHtmlFile: false,
      files: [
        {
          name: 'file1.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 123,
        },
        {
          name: 'file2.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 321,
        },
        {
          name: 'file3.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 456,
        },
      ],
      lastModified: new Date('2024-11-04T16:21:30.218Z'),
    });
    expect(directoryCacheInvoked).toBeTruthy();
  });

  test('returns `undefined` for unknown directory & no R2Provider', async () => {
    let directoryCacheInvoked = false;
    const ctx: Context = {
      env: {
        DIRECTORY_CACHE: {
          // @ts-expect-error don't need actual type info here
          async get(): Promise<object | null> {
            directoryCacheInvoked = true;
            return null;
          },
        },
      },
    };

    const kvProvider = new KvProvider(ctx, undefined);

    expect(
      await kvProvider.readDirectory('some/directory/path/')
    ).toBeUndefined();
    expect(directoryCacheInvoked).toBeTruthy();
  });

  test('falls back to R2Provider for unknown directories if it exists', async () => {
    let directoryCacheGetInvoked = false;
    let directoryCachePutInvoked = false;
    const ctx: Context = {
      env: {
        DIRECTORY_CACHE: {
          // @ts-expect-error don't need actual type info here
          async get(): Promise<object | null> {
            directoryCacheGetInvoked = true;
            return null;
          },
          async put(key, value, settings): Promise<void> {
            directoryCachePutInvoked = true;

            expect(key).toStrictEqual('some/directory/path/');
            expect(value).toStrictEqual(
              JSON.stringify({
                subdirectories: [
                  'subdirectory1/',
                  'subdirectory2/',
                  'subdirectory3/',
                ],
                hasIndexHtmlFile: false,
                files: [
                  {
                    name: 'file1.txt',
                    lastModified: '2024-11-04T16:21:30.218Z',
                    size: 123,
                  },
                  {
                    name: 'file2.txt',
                    lastModified: '2024-11-04T16:21:30.218Z',
                    size: 321,
                  },
                  {
                    name: 'file3.txt',
                    lastModified: '2024-11-04T16:21:30.218Z',
                    size: 456,
                  },
                ],
                lastModified: '2024-11-04T16:21:30.218Z',
              })
            );
            expect(settings?.expirationTtl).toEqual(KV_CACHE_TTL);
          },
        },
      },
      // @ts-expect-error don't need full type
      execution: {
        waitUntil(_) {
          // We're not actually waiting on the promise here which is a little
          // racy between the promise & the test ending but it's only by like
          // two ticks max probs
        },
      },
    };

    let r2ProviderInvoked = false;

    // @ts-expect-error don't need the full type here
    const r2Provider: R2Provider = {
      readDirectory: async (path): Promise<ReadDirectoryResult> => {
        r2ProviderInvoked = true;
        directoryCacheGetInvoked = true;
        expect(path).toStrictEqual('some/directory/path/');

        return {
          subdirectories: [
            'subdirectory1/',
            'subdirectory2/',
            'subdirectory3/',
          ],
          hasIndexHtmlFile: false,
          files: [
            {
              name: 'file1.txt',
              lastModified: new Date('2024-11-04T16:21:30.218Z'),
              size: 123,
            },
            {
              name: 'file2.txt',
              lastModified: new Date('2024-11-04T16:21:30.218Z'),
              size: 321,
            },
            {
              name: 'file3.txt',
              lastModified: new Date('2024-11-04T16:21:30.218Z'),
              size: 456,
            },
          ],
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
        };
      },
    };

    const kvProvider = new KvProvider(ctx, r2Provider);

    expect(
      await kvProvider.readDirectory('some/directory/path/')
    ).toStrictEqual({
      subdirectories: ['subdirectory1/', 'subdirectory2/', 'subdirectory3/'],
      hasIndexHtmlFile: false,
      files: [
        {
          name: 'file1.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 123,
        },
        {
          name: 'file2.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 321,
        },
        {
          name: 'file3.txt',
          lastModified: new Date('2024-11-04T16:21:30.218Z'),
          size: 456,
        },
      ],
      lastModified: new Date('2024-11-04T16:21:30.218Z'),
    });
    expect(directoryCacheGetInvoked).toBeTruthy();
    expect(directoryCachePutInvoked).toBeTruthy();
    expect(r2ProviderInvoked).toBeTruthy();
  });

  test('returns `undefined` without hitting KV or R2 when the path exceeds the KV key limit', async () => {
    let directoryCacheInvoked = false;
    let r2ProviderInvoked = false;

    const ctx: Context = {
      env: {
        DIRECTORY_CACHE: {
          // @ts-expect-error don't need actual type info here
          async get(): Promise<object | null> {
            directoryCacheInvoked = true;
            return null;
          },
        },
      },
    };

    const r2Provider = {
      async readDirectory(): Promise<ReadDirectoryResult | undefined> {
        r2ProviderInvoked = true;
        return undefined;
      },
    } as unknown as R2Provider;

    const kvProvider = new KvProvider(ctx, r2Provider);

    // 513 ASCII bytes
    expect(await kvProvider.readDirectory('a'.repeat(513))).toBeUndefined();
    // 171 three-byte characters is 513 bytes, but only 171 characters
    expect(
      await kvProvider.readDirectory('\u3042'.repeat(171))
    ).toBeUndefined();

    expect(directoryCacheInvoked).toBeFalsy();
    expect(r2ProviderInvoked).toBeFalsy();
  });

  test('still looks up a path that is exactly at the KV key limit', async () => {
    let directoryCacheInvoked = false;
    const path = 'a'.repeat(512);

    const ctx: Context = {
      env: {
        DIRECTORY_CACHE: {
          // @ts-expect-error don't need actual type info here
          async get(key: string): Promise<object | null> {
            directoryCacheInvoked = true;
            expect(key).toStrictEqual(path);
            return null;
          },
        },
      },
    };

    const kvProvider = new KvProvider(ctx, undefined);

    expect(await kvProvider.readDirectory(path)).toBeUndefined();
    expect(directoryCacheInvoked).toBeTruthy();
  });
});
