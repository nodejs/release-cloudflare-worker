import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globalSetup: ['./vitest-setup.ts'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          r2Buckets: ['R2_BUCKET'],
          kvNamespaces: ['DIRECTORY_CACHE'],
        },
      },
    },
  },
});
