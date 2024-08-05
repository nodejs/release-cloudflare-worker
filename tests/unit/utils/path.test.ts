import assert from 'node:assert';
import { describe, it } from 'node:test';
import { isDirectoryPath } from '../../../src/utils/path';

describe('isDirectoryPath', () => {
  it('returns true for `/dist/`', () => {
    assert.strictEqual(isDirectoryPath('/dist/'), true);
  });

  it('returns true for `/dist`', () => {
    assert.strictEqual(isDirectoryPath('/dist'), true);
  });

  it('returns true for `/dist/latest-v20.x`', () => {
    assert.strictEqual(isDirectoryPath('/dist/latest-v20.x'), true);
  });

  it('returns true for `/dist/v20.20.2`', () => {
    assert.strictEqual(isDirectoryPath('/dist/v20.20.2'), true);
  });

  it('returns false for `/dist/index.json`', () => {
    assert.strictEqual(isDirectoryPath('/dist/index.json'), false);
  });

  // https://github.com/nodejs/release-cloudflare-worker/issues/71
  it('returns false for `/download/release/latest/win-x64/node_pdb.7z`', () => {
    assert.strictEqual(
      isDirectoryPath('/download/release/latest/win-x64/node_pdb.7z'),
      false
    );
  });

  // https://github.com/nodejs/release-cloudflare-worker/issues/99
  it('returns true for `/docs/latest/api`', () => {
    assert.strictEqual(isDirectoryPath('/docs/latest/api'), true);
  });
});
