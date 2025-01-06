import { env, fetchMock, createExecutionContext } from 'cloudflare:test';
import { test, beforeAll, afterEach, expect, vi } from 'vitest';
import { populateR2WithDevBucket } from './util';
import worker from '../worker';
import { CACHE_HEADERS } from '../constants/cache';
import type { Env } from '../env';

const mockedEnv: Env = {
  ...env,
  ENVIRONMENT: 'e2e-tests',
  CACHING: false,
  LOG_ERRORS: false,
  S3_ENDPOINT: 'https://s3.mock',
  S3_ACCESS_KEY_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  S3_ACCESS_KEY_SECRET:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ORIGIN_HOST: 'https://origin.mock',
};

const s3Url = new URL(mockedEnv.S3_ENDPOINT);
s3Url.host = `${mockedEnv.BUCKET_NAME}.${s3Url.host}`;

beforeAll(async () => {
  fetchMock.activate();
  fetchMock.disableNetConnect();

  await populateR2WithDevBucket();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

test('grabs file from fallback server if r2 request fails', async () => {
  vi.spyOn(env.R2_BUCKET, 'get').mockImplementation(() => {
    throw new TypeError('This should be thrown.');
  });

  let originCalled = false;
  const originResponse = '{ "asd": true }';
  fetchMock
    .get(mockedEnv.ORIGIN_HOST)
    .intercept({
      path: '/dist/index.json',
    })
    .reply(() => {
      originCalled = true;

      return {
        statusCode: 200,
        data: originResponse,
      };
    });

  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/index.json'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.success);
  expect(originCalled).toBeTruthy();
  expect(await res.text()).toStrictEqual(originResponse);
});

test('grabs directory from fallback server if r2 request fails', async () => {
  fetchMock
    .get(s3Url.origin)
    .intercept({
      path: /.*/,
    })
    .reply(500, '')
    .times(1);

  let originCalled = false;
  const originResponse = '';
  fetchMock
    .get(mockedEnv.ORIGIN_HOST)
    .intercept({
      path: '/dist/v20.0.0/',
    })
    .reply(() => {
      originCalled = true;

      return {
        statusCode: 200,
        data: originResponse,
      };
    });

  const ctx = createExecutionContext();

  const res = await worker.fetch(
    new Request('https://localhost/dist/v20.0.0/'),
    mockedEnv,
    ctx
  );

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toStrictEqual(CACHE_HEADERS.failure);
  expect(originCalled).toBeTruthy();
  expect(await res.text()).toStrictEqual(originResponse);
});
