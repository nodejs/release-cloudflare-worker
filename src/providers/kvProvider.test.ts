import { describe, expect, test } from 'vitest';
import { KvProvider } from './kvProvider';

describe('readDirectory', () => {
  test('returns expected response when a directory exists', async () => {
    const kvProvider = new KvProvider({
      ctx: {
        env: {
          DIRECTORY_CACHE: {
            // @ts-expect-error don't need actual type info here
            async get(path: string): Promise<object | null> {
              expect(path).toStrictEqual('some/file/path.json');

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
      },
    });

    expect(await kvProvider.readDirectory('some/file/path.json')).toStrictEqual(
      {
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
      }
    );
  });

  test('returns `undefined` for unknown directory', async () => {
    const kvProvider = new KvProvider({
      ctx: {
        env: {
          DIRECTORY_CACHE: {
            // @ts-expect-error don't need actual type info here
            async get(): Promise<object | null> {
              return null;
            },
          },
        },
      },
    });

    expect(
      await kvProvider.readDirectory('some/file/path.json')
    ).toBeUndefined();
  });
});
