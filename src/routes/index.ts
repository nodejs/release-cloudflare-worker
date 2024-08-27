import latestVersions from '../constants/latestVersions.json' assert { type: 'json' };
import { cached } from '../middleware/cacheMiddleware';
import { NotFoundMiddleware } from '../middleware/notFoundMiddleware';
import { OptionsMiddleware } from '../middleware/optionsMiddleware';
import { OriginMiddleware } from '../middleware/originMiddleware';
import { R2Middleware } from '../middleware/r2Middleware';
import { SubtitutionMiddleware } from '../middleware/subtituteMiddleware';
import type { Router } from './router';

export function registerRoutes(router: Router): void {
  const r2Middleware = cached(new R2Middleware());
  const originMiddleware = cached(new OriginMiddleware());

  router.options('*', [new OptionsMiddleware()]);

  router.head('/metrics/?:filePath+', [r2Middleware, originMiddleware]);
  router.get('/metrics/?:filePath+', [r2Middleware, originMiddleware]);

  // Register routes for latest releases (e.g. `/dist/latest/`)
  for (const branch in latestVersions) {
    const latestVersion = latestVersions[branch as keyof typeof latestVersions];
    const subtitutionMiddleware = new SubtitutionMiddleware(
      router,
      branch,
      latestVersion
    );

    router.head(`/dist/${branch}*`, [subtitutionMiddleware]);
    router.get(`/dist/${branch}*`, [subtitutionMiddleware]);

    router.head(`/download/release/${branch}*`, [subtitutionMiddleware]);
    router.get(`/download/release/${branch}*`, [subtitutionMiddleware]);

    router.head(`/docs/${branch}*`, [subtitutionMiddleware]);
    router.get(`/docs/${branch}*`, [subtitutionMiddleware]);
  }

  router.head('/dist/?:filePath+', [r2Middleware, originMiddleware]);
  router.get('/dist/?:filePath+', [r2Middleware, originMiddleware]);

  router.head('/download/?:filePath+', [r2Middleware, originMiddleware]);
  router.get('/download/?:filePath+', [r2Middleware, originMiddleware]);

  router.head('/api/?:filePath+', [r2Middleware, originMiddleware]);
  router.get('/api/?:filePath+', [r2Middleware, originMiddleware]);

  router.head('/docs/?:version?/:filePath+?', [r2Middleware, originMiddleware]);
  router.get('/docs/?:version?/:filePath+?', [r2Middleware, originMiddleware]);

  router.get('*', [new NotFoundMiddleware()]);
}

export * from './router';