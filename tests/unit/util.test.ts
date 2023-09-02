import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  isDirectoryPath,
  mapUrlPathToBucketPath,
  niceBytes,
} from '../../src/util';

describe('mapUrlPathToBucketPath', () => {
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
    assert.strictEqual(result, 'nodejs/release');
  });

  it('converts `/dist/latest` to `nodejs/release/latest`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/dist/latest'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/release/latest');
  });

  it('converts `/download` to `nodejs`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/download'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs');
  });

  it('converts `/download/releases` to `nodejs/releases`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/download/releases'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/releases');
  });

  it('converts `/docs` to `nodejs/docs`', () => {
    const result = mapUrlPathToBucketPath(new URL('http://localhost/docs'), {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.strictEqual(result, 'nodejs/docs');
  });

  it('converts `/docs/releases` to `nodejs/docs/latest`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/docs/latest'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/docs/latest');
  });

  it('converts `/api` to `nodejs/docs`', () => {
    const result = mapUrlPathToBucketPath(new URL('http://localhost/api'), {
      DIRECTORY_LISTING: 'restricted',
    });
    assert.strictEqual(result, 'nodejs/docs/latest/api');
  });

  it('converts `/api/assert.html` to `nodejs/docs/latest/api/assert.html`', () => {
    const result = mapUrlPathToBucketPath(
      new URL('http://localhost/api/assert.html'),
      {
        DIRECTORY_LISTING: 'restricted',
      }
    );
    assert.strictEqual(result, 'nodejs/docs/latest/api/assert.html');
  });
});

describe('isDirectoryPath', () => {
  it('returns true for `/dist/`', () => {
    assert.strictEqual(isDirectoryPath('/dist/'), true);
  });

  it('returns true for `/dist`', () => {
    assert.strictEqual(isDirectoryPath('/dist'), true);
  });

  it('returns false for `/dist/index.json`', () => {
    assert.strictEqual(isDirectoryPath('/dist/index.json'), false);
  });
});

describe('niceBytes', () => {
  it('converts 10 to `10 B`', () => {
    const result = niceBytes(10);
    assert.strictEqual(result, '10 B');
  });

  it('converts 1024 to `1.0 KB`', () => {
    const result = niceBytes(1024);
    assert.strictEqual(result, '1.0 KB');
  });
});
