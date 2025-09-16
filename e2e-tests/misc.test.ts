import { env, fetchMock, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, expect } from 'vitest';
import { populateR2WithDevBucket } from './util';
import worker from '../src/worker';
import type { Env } from '../src/env';

const mockedEnv: Env = {
  ...env,
  ENVIRONMENT: 'e2e-tests',
  CACHING: false,
  LOG_ERRORS: true,
};

beforeAll(async () => {
  fetchMock.activate();
  fetchMock.disableNetConnect();

  await populateR2WithDevBucket();
});

// Ensure methods we don't support are handled properly
for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'PROPFIND']) {
  test(`${method} \`/\` returns a 405`, async () => {
    const ctx = createExecutionContext();

    const res = await worker.fetch(
      new Request('https://localhost/', { method }),
      mockedEnv,
      ctx
    );

    // Consume body promise
    await res.text();

    expect(res.status).toBe(405);
  });
}
