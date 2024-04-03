import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  mapUrlPathToBucketPath,
  mapBucketPathToUrlPath,
  isDirectoryPath,
} from '../../../src/utils/path';
import { REDIRECT_MAP } from '../../../src/constants/r2Prefixes';

describe('mapUrlPathToBucketPath', () => {
  it('expects all items in REDIRECT_MAP to be pathes in the length of 3', () => {
    // If this test breaks, the code will and we'll need to fix the code
    REDIRECT_MAP.forEach((val, key) => {
      assert.strictEqual(
        key.split('/').length,
        3,
        `expected ${key} to be a path with 3 slashes`
      );
    });
  });

  it('converts `/unknown-base-path` to undefined when DIRECTORY_LISTING=restricted', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/unknown-base-path'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, undefined);
  });

  it('converts `/unknown-base-path` to `unknown-base-path` when DIRECTORY_LISTING=on', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/unknown-base-path'),
      {
        DIRECTORY_LISTING: 'on',
      }
    );
    assert.strictEqual(result, 'unknown-base-path');
  });

  it('converts `/dist` to `nodejs/release`', () => {
    const result = mapUrlPathToBucketPath(new URL('http://localhost/dist'), {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.strictEqual(result, 'nodejs/release/');
  });

  it('converts `/dist/latest` to `nodejs/release/v.X.X.X`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/dist/latest'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.match(result ?? '', /^nodejs\/release\/v.\d+\.\d+\.\d+\/$/);
  });

  it('converts `/download` to `nodejs`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/download'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/');
  });

  it('converts `/download/release` to `nodejs/release`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/download/release'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/release');
  });

  it('converts `/download/release/latest` to `nodejs/release/v.X.X.X`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/download/release/latest'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.match(result ?? '', /^nodejs\/release\/v.\d+\.\d+\.\d+\/$/);
  });

  it('converts `/docs/latest` to `nodejs/release/v.X.X.X/docs/`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/docs/latest'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.match(result ?? '', /^nodejs\/release\/v.\d+\.\d+\.\d+\/docs\/$/);
  });

  it('converts `/api` to `nodejs/release/v.X.X.X/docs/api/`', () => {
    const result = mapUrlPathToBucketPath(new URL('http://localhost/api'), {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.match(
      result ?? '',
      /^nodejs\/release\/v.\d+\.\d+\.\d+\/docs\/api\/$/
    );
  });

  it('converts `/api/assert.html` to `nodejs/release/v.X.X.X/docs/api/assert.html`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/api/assert.html'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.match(
      result ?? '',
      /^nodejs\/release\/v.\d+\.\d+\.\d+\/docs\/api\/assert\.html$/
    );
  });
});

describe('mapBucketPathToUrlPath', () => {
  it('converts `unknown-base-path` to `/unknown-base-path` when DIRECTORY_LISTING=on', () => {
    const result = mapBucketPathToUrlPath('unknown-base-path', {
      DIRECTORY_LISTING: 'on',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/unknown-base-path'));
  });

  it('converts `nodejs/release` to `/dist` and `/download/release`', () => {
    const result = mapBucketPathToUrlPath('nodejs/release', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/dist/'));
    assert(result!.includes('/download/release/'));
  });

  it('converts `nodejs/release/latest` to `/dist/latest` and `/download/release/latest`', () => {
    const result = mapBucketPathToUrlPath('nodejs/release/latest', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/dist/latest/'));
    assert(result!.includes('/download/release/latest/'));
  });

  it('converts `nodejs` to `/download`', () => {
    const result = mapBucketPathToUrlPath('nodejs', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/download'));
  });

  it('converts `nodejs/docs` to `/docs`', () => {
    const result = mapBucketPathToUrlPath('nodejs/docs', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/docs/'));
  });

  it('converts `nodejs/docs/latest` to `/docs/latest`', () => {
    const result = mapBucketPathToUrlPath('nodejs/docs/latest', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/docs/latest/'));
  });

  it('converts `nodejs/docs/latest/api` to `/api` and `/docs/latest/api`', () => {
    const result = mapBucketPathToUrlPath('nodejs/docs/latest/api/', {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/api/'));
    assert(result!.includes('/docs/latest/api/'));
  });

  it('converts `nodejs/docs/latest/api/assert.html` to `/api/assert.html` and `/docs/latest/api/assert.html`', () => {
    const result = mapBucketPathToUrlPath(
      'nodejs/docs/latest/api/assert.html',
      { DIRECTORY_LISTING: 'restricted' }
    );
    assert.notStrictEqual(result, undefined);

    assert(result!.includes('/api/assert.html'));
    assert(result!.includes('/docs/latest/api/assert.html'));
  });
});

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
