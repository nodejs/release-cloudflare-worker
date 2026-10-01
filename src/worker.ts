import * as Sentry from '@sentry/cloudflare';
import type { Env } from './env';
import responses from './responses';
import type { Context } from './context';
import {
  getMainlineRouter,
  getUnofficialBuildsRouter,
  type Router,
} from './routes';

const mainlineRouter = getMainlineRouter();
const unofficialBuildsRouter = getUnofficialBuildsRouter();

// TODO better place for this?
const hostnameToRouterMap: Record<string, Router> = {
  'nodejs.org': mainlineRouter,
  'r2.nodejs.org': mainlineRouter,
  'dist-worker-prod.nodejs.workers.dev': mainlineRouter,
  'r2-staging.nodejs.org': mainlineRouter,
  'dist-worker-staging.nodejs.workers.dev': mainlineRouter,
  'unofficial-builds.nodejs.org': unofficialBuildsRouter,
};

const handler = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    Sentry.setTags({
      request_id: crypto.randomUUID(),
      user_agent: request.headers.get('user-agent'),
      ray_id: request.headers.get('cf-ray'),

      // Type casts needed to keep lsp happy
      ip_country: request.cf?.country as Iso3166Alpha2Code | undefined,
      colo: request.cf?.colo as string | undefined,
    });

    const context: Context = {
      env: env,
      execution: ctx,
    };

    // todo pass this to the router so we're not doing it multiple times
    const url = URL.parse(request.url);
    if (url === null) {
      return responses.badRequest();
    }

    const router = hostnameToRouterMap[url.hostname];
    if (router === undefined) {
      return responses.badRequest();
    }

    try {
      const response: unknown = await router.fetch(request, context);

      if (!(response instanceof Response)) {
        // Didn't get a proper response from the router
        throw new TypeError(
          `router response not instanceof Response (typeof=${typeof response}, ctor=${response?.constructor?.name})`
        );
      }

      return response;
    } catch (err) {
      Sentry.captureException(err);

      if (env.LOG_ERRORS === true) {
        console.error(err);
      }

      return responses.internalServerError(err, env);
    }
  },
} satisfies ExportedHandler<Env>;

export default Sentry.withSentry<Env, unknown, unknown, typeof handler>(
  env => ({
    dsn: env.SENTRY_DSN,
  }),
  handler
);
