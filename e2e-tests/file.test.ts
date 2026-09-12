import { env, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, afterEach, expect, vi } from 'vitest';
import { populateR2WithDevBucket } from './util';
import worker from '../src/worker';
import type { Env } from '../src/env';
import { CACHE_HEADERS } from '../src/constants/cache';
import latestVersions from '../src/constants/latestVersions.json' assert { type: 'json' };

const mockedEnv: Env = {
  ...env,
  ENVIRONMENT: 'e2e-tests',
  CACHING: false,
  LOG_ERRORS: true,
};

beforeAll(async () => {
  await populateR2WithDevBucket();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('GET a versioned asset is cached immutably', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/docs/apilinks.json'),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(
    CACHE_HEADERS.immutable
  );
});

test('HEAD a versioned asset is cached immutably', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/docs/apilinks.json', {
      method: 'HEAD',
    }),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(
    CACHE_HEADERS.immutable
  );
});

test('GET a `SHASUMS256.txt` is not cached immutably', async () => {
  // Regenerated in place by the post-promotion re-sha and signing steps.
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/SHASUMS256.txt'),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.mutable);
});

test('GET through a `latest` alias is not cached immutably', async () => {
  // The alias is substituted to a concrete version before R2 is hit, so the
  //  cache policy has to be decided from the *original* url. Seed the
  //  substituted target rather than committing a fixture, so this doesn't break
  //  every time the alias is bumped to a new patch release.
  const version = latestVersions['latest-v20.x'];
  await env.R2_BUCKET.put(`nodejs/release/${version}/docs/apilinks.json`, '{}');

  const ctx = createExecutionContext();

  const aliased = await worker.fetch(
    new Request('https://localhost/dist/latest-v20.x/docs/apilinks.json'),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await aliased.text();

  expect(aliased.status).toBe(200);
  expect(aliased.headers.get('cache-control')).toStrictEqual(
    CACHE_HEADERS.mutable
  );

  // ...while the same file under its concrete version stays immutable.
  const concrete = await worker.fetch(
    new Request(`https://localhost/dist/${version}/docs/apilinks.json`),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await concrete.text();

  expect(concrete.status).toBe(200);
  expect(concrete.headers.get('cache-control')).toStrictEqual(
    CACHE_HEADERS.immutable
  );
});

test('GET an invalid object name returns 400 with the failure cache policy', async () => {
  vi.spyOn(env.R2_BUCKET, 'get').mockImplementation(() => {
    // R2 error 10020: object name not valid
    throw new Error('10020: The specified key does not exist.');
  });

  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/SHASUMS256.txt'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(400);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.failure);
});

test('GET an out-of-bounds range returns 416 with the failure cache policy', async () => {
  vi.spyOn(env.R2_BUCKET, 'get').mockImplementation(() => {
    // R2 error 10039: range not satisfiable
    throw new Error('10039: The requested range is not satisfiable.');
  });

  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/SHASUMS256.txt', {
      headers: { range: 'bytes=999999-1000000' },
    }),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(416);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.failure);
});

test('GET `/dist/index.json` returns 200', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/index.json'),
    mockedEnv,
    ctx
  );

  // Consume the body promise
  await res.text();

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.mutable);
});

test('GET `/dist/asd123.json` returns 404', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/asd123.json'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(404);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.failure);
  expect(await res.text()).toStrictEqual('File not found');
});

test('`if-modified-since` header', async () => {
  const ctx = createExecutionContext();

  let lastModified: string;

  // Make first request to grab its last modified date
  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json'),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);

    lastModified = res.headers.get('last-modified')!;
    expect(lastModified).not.toBeNull();
  }

  // Returns a 304 when if-modified-since >= the file's last modified
  {
    const date = new Date(lastModified);
    date.setMinutes(date.getMinutes() + 1);

    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: {
          'if-modified-since': date.toUTCString(),
        },
      }),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(304);
  }

  // Returns a 200 when if-modified-since is <= the file's last modified
  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: {
          'if-modified-since': new Date(0).toUTCString(),
        },
      }),
      env,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);
  }
});

test('`if-unmodified-since` header', async () => {
  const ctx = createExecutionContext();

  let lastModified: string;

  // Make first request to grab its last modified date
  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json'),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);

    lastModified = res.headers.get('last-modified')!;
    expect(lastModified).not.toBeNull();
  }

  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: {
          'if-unmodified-since': new Date(0).toUTCString(),
        },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(412);
  }

  {
    const date = new Date(lastModified);
    date.setMinutes(date.getMinutes() + 1);

    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: {
          'if-unmodified-since': date.toUTCString(),
        },
      }),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);
  }
});

test('`if-match` header', async () => {
  const ctx = createExecutionContext();

  let etag: string;

  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json'),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);

    etag = res.headers.get('etag')!;
    expect(etag).not.toBeNull();
  }

  // Non-matching etag returns a 304
  {
    const randomEtag = crypto.randomUUID().replaceAll('-', '');
    expect(etag).not.toStrictEqual(randomEtag);

    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: { 'if-match': `"${randomEtag}"` },
      }),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(304);
    // Must match the 200's policy: a 304's headers update the stored response,
    //  so `no-store` here would evict the entry being revalidated.
    expect(res.headers.get('cache-control')).toStrictEqual(
      CACHE_HEADERS.mutable
    );
  }

  // Matching etag returns 200
  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: { 'if-match': etag },
      }),
      mockedEnv,
      ctx
    );

    // Consume the body promise
    await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toStrictEqual(
      CACHE_HEADERS.mutable
    );
  }
});

test('`if-none-match` header', async () => {
  const ctx = createExecutionContext();

  let etag: string;

  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json'),
      mockedEnv,
      ctx
    );

    // Consume body promise
    await res.text();

    expect(res.status).toBe(200);

    etag = res.headers.get('etag')!;
    expect(etag).not.toBeNull();
  }

  // Request w/ random etag returns 200
  {
    const randomEtag = crypto.randomUUID().replaceAll('-', '');
    expect(etag).not.toStrictEqual(randomEtag);

    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: { 'if-none-match': `"${randomEtag}"` },
      }),
      mockedEnv,
      ctx
    );

    // Consume body promise
    await res.text();

    expect(res.status).toBe(200);
  }

  // Request w/ matching etag returns 304
  {
    const res = await worker.fetch(
      new Request('https://localhost/dist/index.json', {
        headers: { 'if-none-match': etag },
      }),
      mockedEnv,
      ctx
    );

    // Consume body promise
    await res.text();

    expect(res.status).toBe(304);
  }
});

test('`range` header', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/index.json', {
      headers: {
        range: 'bytes=0-7',
      },
    }),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(206);
  expect(await res.text()).toBe('{ "hello');
});
