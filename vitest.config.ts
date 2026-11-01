import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
      miniflare: {
        r2Buckets: ['R2_BUCKET'],
        kvNamespaces: ['DIRECTORY_CACHE'],
      },
    }),
  ],
  test: {
    globalSetup: ['./vitest-setup.ts'],
  },
});
