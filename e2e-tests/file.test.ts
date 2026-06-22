import { env, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, afterEach, expect, vi } from 'vitest';
import { populateR2WithDevBucket } from './util';
import worker from '../src/worker';
import type { Env } from '../src/env';
import { CACHE_HEADERS } from '../src/constants/cache';

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
    new Request('https://localhost/dist/v20.0.0/SHASUMS256.txt'),
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
    new Request('https://localhost/dist/v20.0.0/SHASUMS256.txt', {
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
    expect(res.headers.get('cache-control')).toStrictEqual(
      CACHE_HEADERS.failure
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
