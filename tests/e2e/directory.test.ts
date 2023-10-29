import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'http';
import { Miniflare } from 'miniflare';

async function startS3Mock(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    let xmlFilePath = './tests/e2e/test-data/expected-s3/';

    // Check if it's a path that's supposed to exist in
    //  later tests. If so, return a S3 response indicating that
    //  the path exists. Otherwise return a S3 response indicating
    //  that the path doesn't exist
    const r2Prefix = url.searchParams.get('prefix')!;

    let doesFolderExist =
      ['nodejs/release/', 'nodejs/', 'nodejs/docs/', 'metrics/'].includes(
        r2Prefix
      ) || r2Prefix.endsWith('/docs/api/');

    if (doesFolderExist) {
      xmlFilePath += 'ListObjectsV2-exists.xml';
    } else {
      xmlFilePath += 'ListObjectsV2-does-not-exist.xml';
    }

    const listObjectsResponse = readFileSync(xmlFilePath, {
      encoding: 'utf-8',
    });

    res.write(listObjectsResponse);
    res.end();
  });
  server.listen(8080);

  return server;
}

describe('Directory Tests (Restricted Directory Listing)', () => {
  let s3Mock: http.Server;
  let mf: Miniflare;
  let url: URL;
  before(async () => {
    s3Mock = await startS3Mock();

    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        BUCKET_NAME: 'dist-prod',
        // S3_ENDPOINT needs to be an ip here otherwise s3 sdk will try to hit
        //  the bucket's subdomain (e.g. http://dist-prod.localhost)
        S3_ENDPOINT: 'http://127.0.0.1:8080',
        S3_ACCESS_KEY_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        S3_ACCESS_KEY_SECRET:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
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

  it('allows HEAD `/dist` and returns no body', async () => {
    const res = await mf.dispatchFetch(`${url}dist/`, {
      method: 'HEAD',
    });
    assert.strictEqual(res.status, 200);

    const body = await res.text();
    assert.strictEqual(body.length, 0);
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

  it('allows `/docs/`', async () => {
    const res = await mf.dispatchFetch(`${url}docs/`);
    assert.strictEqual(res.status, 200);
  });

  it('allows `/api/`', async () => {
    const res = await mf.dispatchFetch(`${url}api/`);
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
  after(async () => {
    await mf.dispose();
    s3Mock.close();
  });
});
