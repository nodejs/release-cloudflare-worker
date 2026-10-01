import latestVersions from '../constants/latestVersions.json' assert { type: 'json' };
import {
  MAINLINE_RELEASE_CONFIG,
  UNOFFICIAL_BUILDS_RELEASE_CONFIG,
} from '../constants/release-config';
import { MethodNotAllowedMiddleware } from '../middleware/methodNotAllowedMiddleware';
import { NotFoundMiddleware } from '../middleware/notFoundMiddleware';
import { OptionsMiddleware } from '../middleware/optionsMiddleware';
import { OriginMiddleware } from '../middleware/originMiddleware';
import { R2Middleware } from '../middleware/r2Middleware';
import { RedirectionMiddleware } from '../middleware/redirectionMiddleware';
import { SubtitutionMiddleware } from '../middleware/subtituteMiddleware';
import { ThrowMiddleware } from '../middleware/throwMiddleware';
import { Router } from './router';

/**
 * Register routes shared by all routers
 */
function registerCommonRoutes(router: Router): void {
  router.options('*', new OptionsMiddleware());
  router.get('*', new NotFoundMiddleware());
  router.head('*', new NotFoundMiddleware());
  router.all('*', new MethodNotAllowedMiddleware());
}

export function getMainlineRouter(): Router {
  const router = new Router();

  const r2Middleware = new R2Middleware(MAINLINE_RELEASE_CONFIG);
  const originMiddleware = new OriginMiddleware();

  const corepackRedirectMiddleware = new RedirectionMiddleware(
    'https://github.com/nodejs/corepack#readme'
  );

  router.head('/metrics/?:filePath+', r2Middleware, originMiddleware);
  router.get('/metrics/?:filePath+', r2Middleware, originMiddleware);

  router.all('/api/corepack.html', corepackRedirectMiddleware);
  router.all('/docs/latest/api/corepack.html', corepackRedirectMiddleware);

  // Register routes for latest releases (e.g. `/dist/latest/`)
  for (const branch in latestVersions) {
    const latestVersion = latestVersions[branch as keyof typeof latestVersions];
    const subtitutionMiddleware = new SubtitutionMiddleware(
      router,
      branch,
      latestVersion
    );

    router.head(`/dist/${branch}*`, subtitutionMiddleware);
    router.get(`/dist/${branch}*`, subtitutionMiddleware);

    router.head(`/download/release/${branch}*`, subtitutionMiddleware);
    router.get(`/download/release/${branch}*`, subtitutionMiddleware);

    router.head(`/docs/${branch}*`, subtitutionMiddleware);
    router.get(`/docs/${branch}*`, subtitutionMiddleware);
  }

  router.head('/node-config-schema.json', r2Middleware);
  router.get('/node-config-schema.json', r2Middleware);

  router.head('/llms.txt', r2Middleware);
  router.get('/llms.txt', r2Middleware);

  router.head('/dist/?:filePath+', r2Middleware, originMiddleware);
  router.get('/dist/?:filePath+', r2Middleware, originMiddleware);

  router.head('/download/?:filePath+', r2Middleware, originMiddleware);
  router.get('/download/?:filePath+', r2Middleware, originMiddleware);

  router.head('/api/?:filePath+', r2Middleware, originMiddleware);
  router.get('/api/?:filePath+', r2Middleware, originMiddleware);

  router.head('/docs/?:version?/:filePath+?', r2Middleware, originMiddleware);
  router.get('/docs/?:version?/:filePath+?', r2Middleware, originMiddleware);

  router.post('/_throw', new ThrowMiddleware());

  registerCommonRoutes(router);

  return router;
}

/**
 * @see https://github.com/nodejs/build/blob/e4d53ee871b08a5ab34b0cde5727476db23b0c42/ansible/roles/nginx/templates/unofficial-builds.nodejs.org.conf.j2#L11
 */
export function getUnofficialBuildsRouter(): Router {
  const router = new Router();

  const r2Middleware = new R2Middleware(UNOFFICIAL_BUILDS_RELEASE_CONFIG);

  router.head('*', r2Middleware);
  router.get('*', r2Middleware);

  registerCommonRoutes(router);

  return router;
}

export * from './router';
