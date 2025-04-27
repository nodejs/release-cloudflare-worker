import { describe, test, expect } from 'vitest';
import { isDirectoryPath } from './path';

describe('isDirectoryPath', () => {
  test('returns true for `/dist/`', () => {
    expect(isDirectoryPath('/dist/')).toEqual(true);
  });

  test('returns true for `/dist`', () => {
    expect(isDirectoryPath('/dist')).toEqual(true);
  });

  test('returns true for `/dist/latest-v20.x`', () => {
    expect(isDirectoryPath('/dist/latest-v20.x')).toEqual(true);
  });

  test('returns true for `/dist/v20.20.2`', () => {
    expect(isDirectoryPath('/dist/v20.20.2')).toEqual(true);
  });

  test('returns false for `/dist/index.json`', () => {
    expect(isDirectoryPath('/dist/index.json')).toEqual(false);
  });

  // https://github.com/nodejs/release-cloudflare-worker/issues/71
  test('returns false for `/download/release/latest/win-x64/node_pdb.7z`', () => {
    expect(
      isDirectoryPath('/download/release/latest/win-x64/node_pdb.7z')
    ).toEqual(false);
  });

  // https://github.com/nodejs/release-cloudflare-worker/issues/99
  test('returns true for `/docs/latest/api`', () => {
    expect(isDirectoryPath('/docs/latest/api')).toEqual(true);
  });
});
