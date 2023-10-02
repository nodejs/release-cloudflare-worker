import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';

describe('Directory Tests (Restricted Directory Listing)', () => {
  let mf: Miniflare;
  let url: URL;
  before(async () => {
    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        DIRECTORY_LISTING: 'restricted',
        FILE_CACHE_CONTROL: 'no-store',
        DIRECTORY_CACHE_CONTROL: 'no-store',
      },
      r2Persist: './tests/e2e/test-data',
      r2Buckets: ['R2_BUCKET'],
    });

    // Wait for it Miniflare to start
    url = await mf.ready;
  });

  it('redirects `/dist` to `/dist/` and returns expected html', async () => {
    const [originalRes, expectedHtml] = await Promise.all([
      mf.dispatchFetch(`${url}dist`, { redirect: 'manual' }),
      readFile('./tests/e2e/test-data/expected-html/dist.txt', {
        encoding: 'utf-8',
      }),
    ]);

    assert.strictEqual(originalRes.status, 301);
    const res = await mf.dispatchFetch(originalRes.headers.get('location')!);

    // Assert that the html matches what we're expecting
    //  to be returned. If this passes, we can assume
    //  it'll pass for the other listings and therefore
    //  don't need to test it over and over again
    const body = await res.text();
    assert.strictEqual(body, expectedHtml.replaceAll('\n', ''));
  });

  it('allows `/dist/`', async () => {
    const res = await mf.dispatchFetch(`${url}dist/`);

    assert.strictEqual(res.status, 200);
  });

  it('redirects `/download` to `/download/`', async () => {
    const originalRes = await mf.dispatchFetch(`${url}download`, {
      redirect: 'manual',
    });
    assert.strictEqual(originalRes.status, 301);
    const res = await mf.dispatchFetch(originalRes.headers.get('location')!);
    assert.strictEqual(res.status, 200);
  });

  it('allows `/download/`', async () => {
    const res = await mf.dispatchFetch(`${url}download/`);
    assert.strictEqual(res.status, 200);
  });

  it('redirects `/metrics` to `/metrics/`', async () => {
    const originalRes = await mf.dispatchFetch(`${url}metrics`, {
      redirect: 'manual',
    });
    assert.strictEqual(originalRes.status, 301);
    const res = await mf.dispatchFetch(originalRes.headers.get('location')!);
    assert.strictEqual(res.status, 200);
  });

  it('allows `/metrics/`', async () => {
    const res = await mf.dispatchFetch(`${url}metrics/`);
    assert.strictEqual(res.status, 200);
  });

  it('returns 401 for unrecognized base paths', async () => {
    let res = await mf.dispatchFetch(url);
    assert.strictEqual(res.status, 401);

    res = await mf.dispatchFetch(`${url}/asd/`);
    assert.strictEqual(res.status, 401);

    res = await mf.dispatchFetch(`${url}/asd/123/`);
    assert.strictEqual(res.status, 401);
  });

  it('returns 404 for unknown directory', async () => {
    const res = await mf.dispatchFetch(`${url}/dist/asd123/`);
    assert.strictEqual(res.status, 404);

    const body = await res.text();
    assert.strict(body, 'Directory not found');
  });

  // Cleanup Miniflare
  after(async () => mf.dispose());
});
