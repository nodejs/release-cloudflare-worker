import { cached } from '../middleware/cacheMiddleware';
import { NotFoundMiddleware } from '../middleware/notFoundMiddleware';
import { OptionsMiddleware } from '../middleware/optionsMiddleware';
import { OriginMiddleware } from '../middleware/originMiddleware';
import { R2Middleware } from '../middleware/r2Middleware';
import { Router } from './router';

export function registerRoutes(router: Router): void {
  const r2Middleware = new R2Middleware();
  const originMiddleware = new OriginMiddleware();

  router.options('*', [new OptionsMiddleware()]);

  router.head('/metrics/?:path+', [r2Middleware, originMiddleware]);
  router.get('/metrics/?:path+', [cached(r2Middleware), originMiddleware]);

  router.head('/dist/?:path+', [r2Middleware, originMiddleware]);
  router.get('/dist/?:path+', [cached(r2Middleware), originMiddleware]);

  router.head('/download/?:path+', [r2Middleware, originMiddleware]);
  router.get('/download/?:path+', [cached(r2Middleware), originMiddleware]);

  router.head('/api/?:path+', [r2Middleware, originMiddleware]);
  router.get('/api/?:path+', [cached(r2Middleware), originMiddleware]);

  router.head('/docs/?:version?/:path+?', [r2Middleware, originMiddleware]);
  router.get('/docs/?:version?/:path+?', [
    cached(r2Middleware),
    originMiddleware,
  ]);

  router.get('*', [new NotFoundMiddleware()]);
}

export * from './router';
