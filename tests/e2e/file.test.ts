import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { Miniflare } from 'miniflare';
import path from 'node:path';

describe('File Tests', () => {
  let mf: Miniflare;
  let url: URL;
  const cacheControl = 'no-store';
  before(async () => {
    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        DIRECTORY_LISTING: 'restricted',
        CACHE_CONTROL: cacheControl,
        DIRECTORY_CACHE_CONTROL: 'no-store',
      },
      r2Persist: './tests/e2e/test-data',
      r2Buckets: ['R2_BUCKET'],
    });

    // Wait for it Miniflare to start
    url = await mf.ready;
  });

  it('`/dist/index.json` returns expected body, status code, and headers', async () => {
    const res = await mf.dispatchFetch(`${url}dist/index.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json');
    assert.strictEqual(res.headers.get('cache-control'), cacheControl);
    assert.strictEqual(res.headers.has('etag'), true);
    assert.strictEqual(res.headers.has('last-modified'), true);
    assert.strictEqual(res.headers.has('content-type'), true);

    const body = await res.text();
    assert.strictEqual(body, `{ hello: 'world' }`);
  });

  it('returns 404 for unknown file', async () => {
    const res = await mf.dispatchFetch(`${url}dist/asd123.json`);
    assert.strictEqual(res.status, 404);

    const body = await res.text();
    assert.strictEqual(body, 'File not found');
  });

  /**
   * R2 supports all conditional headers except If-Range
   * @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests#conditional_headers
   */
  it('handles if-modified-since correctly', async () => {
    let res = await mf.dispatchFetch(`${url}dist/index.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.has('last-modified'), true);

    // Make sure it returns a 304 when If-Modified-Since
    //  >= file last modified
    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-modified-since': res.headers.get('last-modified')!,
      },
    });
    assert.strictEqual(res.status, 304);

    // Make sure it returns a 200 w/ the file contents
    //  when If-Modified-Since < file last modified
    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-modified-since': new Date(0).toUTCString(),
      },
    });
    assert.strictEqual(res.status, 200);
  });

  it('handles if-unmodified-since header correctly', async () => {
    let res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-unmodified-since': new Date(0).toUTCString(),
      },
    });
    assert.strictEqual(res.status, 412);
  });

  it('handles if-match correctly', async () => {
    let res = await mf.dispatchFetch(`${url}dist/index.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.has('etag'), true);

    const originalETag = res.headers.get('etag')!;

    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-match': '"asd"',
      },
    });
    assert.strictEqual(res.status, 412);

    // If-Match w/ valid etag returns 200
    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-match': originalETag,
      },
    });
    assert.strictEqual(res.status, 200);
  });

  it('handles if-none-match correctly', async () => {
    let res = await mf.dispatchFetch(`${url}dist/index.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.has('etag'), true);

    const originalETag = res.headers.get('etag')!;

    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-none-match': '"asd"',
      },
    });
    assert.strictEqual(res.status, 200);

    // If-None-Match w/ valid etag returns 412
    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-none-match': originalETag,
      },
    });
    assert.strictEqual(res.status, 412);
  });

  it('handles range header correctly', async () => {
    const res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        range: 'bytes=0-7',
      },
    });
    assert.strictEqual(res.status, 206);

    const body = await res.text();
    assert.strictEqual(body, '{ hello:');
  });

  // Cleanup Miniflare
  after(async () => mf.dispose());
});
