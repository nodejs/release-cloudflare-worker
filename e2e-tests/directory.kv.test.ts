import { env, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, expect, vi } from 'vitest';
import {
  populateDirectoryCacheWithDevBucket,
  populateR2WithDevBucket,
} from './util';
import worker from '../src/worker';
import type { Env } from '../src/env';
import { CACHE_HEADERS } from '../src/constants/cache';

const mockedEnv: Env = {
  ...env,
  ENVIRONMENT: 'e2e-tests',
  CACHING: false,
  LOG_ERRORS: true,
  USE_KV: true,
};

beforeAll(async () => {
  await populateR2WithDevBucket();
  await populateDirectoryCacheWithDevBucket();

  vi.mock(
    import('../src/constants/latestVersions.json'),
    async importOriginal => {
      const original = await importOriginal();

      // Point all `latest-` directories to one that exists in the dev bucket
      Object.keys(original.default).forEach(branch => {
        let updatedValue: string;
        if (branch === 'node-latest.tar.gz') {
          updatedValue = 'latest/node-v20.0.0.tar.gz';
        } else {
          updatedValue = 'v20.0.0';
        }

        // @ts-expect-error
        original.default[branch] = updatedValue;
      });

      return original;
    }
  );
});

// Ensure essential endpoints are routable
for (const path of ['/dist/', '/docs/', '/api/', '/download/', '/metrics/']) {
  test(`GET \`${path}\` returns 200`, async () => {
    const ctx = createExecutionContext();

    const res = await worker.fetch(
      new Request(`https://localhost${path}`),
      mockedEnv,
      ctx
    );

    // Consume body promise
    await res.text();

    expect(res.status).toBe(200);
  });
}

test('GET `/dist/unknown-directory/` returns 404', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/unknown-directory/'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(404);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.failure);
  expect(await res.text()).toStrictEqual('Directory not found');
});

test('GET `/dist` redirects to `/dist/`', async () => {
  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(301);
  expect(res.headers.get('location')).toStrictEqual('https://localhost/dist/');
});
