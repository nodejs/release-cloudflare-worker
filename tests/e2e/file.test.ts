import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { Miniflare } from 'miniflare';

describe('File Tests', () => {
  let mf: Miniflare;
  let url: URL;
  before(async () => {
    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        ENVIRONMENT: 'e2e-tests',
        DIRECTORY_LISTING: 'restricted',
      },
      r2Persist: './tests/e2e/test-data',
      r2Buckets: ['R2_BUCKET'],
    });

    // Wait for Miniflare to start
    url = await mf.ready;
  });

  it('`/dist/index.json` returns expected body, status code, and headers', async () => {
    const res = await mf.dispatchFetch(`${url}dist/index.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json');
    assert.strictEqual(
      res.headers.get('cache-control'),
      'public, max-age=3600, s-maxage=14400'
    );
    assert.strictEqual(res.headers.has('etag'), true);
    assert.strictEqual(res.headers.has('last-modified'), true);
    assert.strictEqual(res.headers.has('content-type'), true);

    const body = await res.text();
    assert.strictEqual(body, `{ hello: 'world' }`);
  });

  it('HEAD `/dist/index.json` returns no body and status code 200', async () => {
    const res = await mf.dispatchFetch(`${url}dist/index.json`, {
      method: 'HEAD',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json');
    assert.strictEqual(
      res.headers.get('cache-control'),
      'public, max-age=3600, s-maxage=14400'
    );
    assert.strictEqual(res.headers.has('etag'), true);
    assert.strictEqual(res.headers.has('last-modified'), true);
    assert.strictEqual(res.headers.has('content-type'), true);
    assert.strictEqual(res.headers.has('x-cache-status'), false);

    const body = await res.text();
    assert.strictEqual(body.length, 0);
  });

  it('returns 404 for unknown file', async () => {
    const res = await mf.dispatchFetch(`${url}dist/asd123.json`);
    assert.strictEqual(res.status, 404);

    const body = await res.text();
    assert.strictEqual(body, 'File not found');
    assert.strictEqual(
      res.headers.get('cache-control'),
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );
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
    const res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-unmodified-since': new Date(0).toUTCString(),
      },
    });
    assert.strictEqual(res.status, 412);
    assert.strictEqual(
      res.headers.get('cache-control'),
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );
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
    assert.strictEqual(
      res.headers.get('cache-control'),
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );

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

    // If-None-Match w/ valid etag returns 304 or 412
    res = await mf.dispatchFetch(`${url}dist/index.json`, {
      headers: {
        'if-none-match': originalETag,
      },
    });
    assert(res.status === 304 || res.status === 412);
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
