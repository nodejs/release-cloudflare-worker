import { describe, test, expect } from 'vitest';
import { isImmutablePath, cacheControlFor } from './cache';
import { CACHE_HEADERS } from '../constants/cache';

describe('isImmutablePath', () => {
  test.each([
    '/dist/v20.0.0/node-v20.0.0-linux-x64.tar.gz',
    '/download/release/v20.0.0/node-v20.0.0.pkg',
    '/docs/v18.0.0/api/fs.html',
    '/metrics/processed/total-csv.csv',
  ])('returns true for immutable asset `%s`', path => {
    expect(isImmutablePath(path)).toEqual(true);
  });

  test.each([
    // Directory listings
    '/dist/',
    '/dist/v20.0.0/',
    // Index/metadata files
    '/dist/index.json',
    '/dist/index.tab',
    '/llms.txt',
    '/node-config-schema.json',
    // `/api/*` always serves the latest version's docs
    '/api',
    '/api/fs.html',
    // `latest` aliases point at moving content
    '/dist/latest/node-v20.0.0-linux-x64.tar.gz',
    '/docs/latest/api/fs.html',
    '/download/release/latest/win-x64/node_pdb.7z',
    '/dist/latest-v20.x/node-v20.0.0.tar.gz',
    // Legacy `latest-v0.X.x` aliases
    '/dist/latest-v0.10.x/node-v0.10.48.tar.gz',
    '/dist/latest-v0.12.x/node-v0.12.18.tar.gz',
    // Codename aliases
    '/dist/latest-argon/node-v4.9.1.tar.gz',
    '/download/release/latest-iron/win-x64/node_pdb.7z',
    '/docs/latest-hydrogen/api/fs.html',
    // `node-latest.tar.gz` is a moving alias too
    '/dist/node-latest.tar.gz',
  ])('returns false for mutable path `%s`', path => {
    expect(isImmutablePath(path)).toEqual(false);
  });
});

describe('cacheControlFor', () => {
  test('immutable asset with 200 gets the immutable policy', () => {
    expect(
      cacheControlFor('/dist/v20.0.0/node-v20.0.0-linux-x64.tar.gz', 200)
    ).toEqual(CACHE_HEADERS.immutable);
  });

  test('mutable resource with 200 gets the mutable policy', () => {
    expect(cacheControlFor('/dist/index.json', 200)).toEqual(
      CACHE_HEADERS.mutable
    );
  });

  test.each([206, 304, 412, 404, 500])(
    'status %i always gets the failure policy',
    status => {
      expect(
        cacheControlFor('/dist/v20.0.0/node-v20.0.0.tar.gz', status)
      ).toEqual(CACHE_HEADERS.failure);
    }
  );
});
