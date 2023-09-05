import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { Miniflare } from 'miniflare';

describe('Cache Purge Tests', () => {
  const API_KEY = 'asd123';
  let mf: Miniflare;
  let url: URL;
  before(async () => {
    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        DIRECTORY_LISTING: 'restricted',
        CACHE_CONTROL: 'public',
        DIRECTORY_CACHE_CONTROL: 'public',
        PURGE_API_KEY: API_KEY,
      },
    });

    // Wait for it Miniflare to start
    url = await mf.ready;
  });

  it('returns a 403 when missing api key', async () => {
    const res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
    });
    assert.strictEqual(res.status, 403);
  });

  it('returns a 403 when api key is invalid', async () => {
    const res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': 'something-something',
      },
    });
    assert.strictEqual(res.status, 403);
  });

  it("returns a 415 when `content-type` header is missing or isn't `application/json`", async () => {
    let res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
    });
    assert.strictEqual(res.status, 415);

    res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'text/plain',
      },
    });
    assert.strictEqual(res.status, 415);
  });

  it('returns a 400 when body parsing fails', async () => {
    let res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        something: 'asd',
      }),
    });
    assert.strictEqual(res.status, 400);

    res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: 'something',
    });
    assert.strictEqual(res.status, 400);

    res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        paths: 'not an array',
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('returns 204 and purges the cache properly', async () => {
    const res = await mf.dispatchFetch(`${url}_cf/cache-purge`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        paths: ['nodejs/release/index.json'],
      }),
    });
    assert.strictEqual(res.status, 204);

    // As of now we can't really test that this makes a call
    //  to the cache api to delete the necessary paths.
    //  Unfortunate, but hopefully we'll be able to later on
  });

  // Cleanup Miniflare
  after(async () => mf.dispose());
});
