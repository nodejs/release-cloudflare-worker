import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { Miniflare } from 'miniflare';
import http from 'node:http';

const FILE_PATH_TO_TEST = 'dist/index.json';
let fallbackFilePathHit = false;

const DIRECTORY_TO_TEST = 'download/v1.0.0/';
let fallbackDirectoryPathHit = false;

function startfallbackMock(): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    if (url.pathname === `/${FILE_PATH_TO_TEST}`) {
      fallbackFilePathHit = true;
      res.write('test file');
    } else if (url.pathname === `/${DIRECTORY_TO_TEST}`) {
      fallbackDirectoryPathHit = true;
      res.write('test directory');
    }

    res.end();
  });
  server.listen(8081);

  return server;
}

describe('Fallback tests', () => {
  let fallbackMock: http.Server;
  let mf: Miniflare;
  let url: URL;
  before(async () => {
    // Start www mock
    fallbackMock = startfallbackMock();

    // Setup miniflare
    mf = new Miniflare({
      scriptPath: './dist/worker.js',
      modules: true,
      bindings: {
        ENVIRONMENT: 'e2e-tests',
        ORIGIN_HOST: `http://127.0.0.1:8081`,
      },
    });

    // Wait for Miniflare to start
    url = await mf.ready;
  });

  it('grabs file from fallback server if r2 requests fail', async () => {
    const res = await mf.dispatchFetch(url + FILE_PATH_TO_TEST);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(fallbackFilePathHit, true);

    const body = await res.text();
    assert.strictEqual(body, 'test file');
  });

  it('grabs directory from fallback server if r2 requests fail', async () => {
    const res = await mf.dispatchFetch(url + DIRECTORY_TO_TEST);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(fallbackDirectoryPathHit, true);

    const body = await res.text();
    assert.strictEqual(body, 'test directory');
  });

  // Cleanup Miniflare and fallback mock
  after(async () => {
    await mf.dispose();
    fallbackMock.close();
  });
});
