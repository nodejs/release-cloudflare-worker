import { env, fetchMock, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, afterEach, expect } from 'vitest';
import { populateR2WithDevBucket } from './util';
import worker from '../worker';
import { CACHE_HEADERS } from '../constants/cache';
import type { Env } from '../env';

const mockedEnv: Env = {
  ...env,
  ENVIRONMENT: 'e2e-tests',
  CACHING: false,
  LOG_ERRORS: true,
  S3_ENDPOINT: 'https://s3.mock',
  S3_ACCESS_KEY_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  S3_ACCESS_KEY_SECRET:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

const s3Url = new URL(mockedEnv.S3_ENDPOINT);
s3Url.host = `${mockedEnv.BUCKET_NAME}.${s3Url.host}`;

const S3_DIRECTORY_RESULT = `
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01">
  <Name>dist-prod</Name>
  <Prefix />
  <Marker />
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>false</IsTruncated>
  <CommonPrefixes>
    <Prefix>nodejs/release/v1.0.0/latest/</Prefix>
  </CommonPrefixes>
  <Contents>
    <ETag>"asd123"</ETag>
    <Key>nodejs/release/v1.0.0/index.json</Key>
    <LastModified>2023-09-12T05:43:00.000Z</LastModified>
    <Size>18</Size>
  </Contents>
</ListBucketResult>`;

const S3_EMPTY_DIRECTORY_RESULT = `
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01">
  <Name>dist-prod</Name>
  <Prefix />
  <Marker />
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>false</IsTruncated>
</ListBucketResult>`;

beforeAll(async () => {
  fetchMock.activate();
  fetchMock.disableNetConnect();

  await populateR2WithDevBucket();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

// These paths are cached and don't send requests to S3
for (const path of ['/dist/', '/docs/']) {
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

for (const path of ['/api/', '/download/', '/metrics/']) {
  test(`GET \`${path}\` returns 200`, async () => {
    fetchMock
      .get(s3Url.origin)
      .intercept({
        path: /.*/,
      })
      .reply(200, S3_DIRECTORY_RESULT);

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
  fetchMock
    .get(s3Url.origin)
    .intercept({
      path: /.*/,
      query: {
        prefix: 'nodejs/release/unknown-directory/',
      },
    })
    .reply(200, S3_EMPTY_DIRECTORY_RESULT);

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
