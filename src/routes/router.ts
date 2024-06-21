import { IttyRouter } from 'itty-router';
import type { Middleware } from '../middleware/middleware';
import type { Context } from '../context';
import { parseUrl } from '../utils/request';
import responses from '../responses';
import type { Request as WorkerRequest } from './request';

/**
 * Simple wrapper around {@link IttyRouter} that allows us to do a middleware
 *  approach with our routing.
 * @see {Middleware}
 */
export class Router {
  private itty = IttyRouter<WorkerRequest, [Context], Response>();

  handle(request: Request, ctx: Context): Promise<Response> {
    return this.itty.fetch(request, ctx);
  }

  options(endpoint: string, middlewares: Middleware[]): void {
    const middlewareChain = buildMiddlewareChain(middlewares);

    this.itty.options(endpoint, (req, ctx) => {
      return callMiddlewareChain(middlewareChain, req, ctx);
    });
  }

  head(endpoint: string, middlewares: Middleware[]): void {
    const middlewareChain = buildMiddlewareChain(middlewares);

    this.itty.head(endpoint, (req, ctx) => {
      return callMiddlewareChain(middlewareChain, req, ctx);
    });
  }

  get(endpoint: string, middlewares: Middleware[]): void {
    const middlewareChain = buildMiddlewareChain(middlewares);

    this.itty.get(endpoint, (req, ctx) => {
      return callMiddlewareChain(middlewareChain, req, ctx);
    });
  }
}

type MiddlewareChain = (
  request: WorkerRequest,
  ctx: Context
) => Promise<Response>;

/**
 * Builds a chain of middlewares to call. Chains them in the same order as they
 *  are in the `middlewares` array.
 */
function buildMiddlewareChain(middlewares: Middleware[]): MiddlewareChain {
  // root will be the very first middleware in the chain
  let root: MiddlewareChain = () => {
    throw new Error('reached the end of the middleware chain');
  };

  // Link the middlewares in reverse order for simplicity sakes
  // @ts-expect-error TODO: update types so toReversed is recognized
  for (const middleware of middlewares.toReversed()) {
    const wrappedMiddleware = errorHandled(middleware);

    // Store the previous
    const previous = root;

    root = (request, ctx): Promise<Response> => {
      return wrappedMiddleware.handle(request, ctx, () => {
        return previous(request, ctx);
      });
    };
  }

  return root;
}

async function callMiddlewareChain(
  chain: MiddlewareChain,
  request: WorkerRequest,
  ctx: Context
): Promise<Response> {
  // Parse url here so we don't have to do it multiple times later on
  const url = parseUrl(request);
  if (url === undefined) {
    return responses.badRequest();
  }

  request.urlObj = url;

  return chain(request, ctx);
}

/**
 * Wraps a {@link Middleware} to add basic error reporting and handling to it.
 *  If an error is thrown, it will log it and skip to the next middleware in
 *  the chain.
 */
function errorHandled(middleware: Middleware): Middleware {
  const wrapper: Middleware = {
    async handle(request: WorkerRequest, ctx: Context, next) {
      try {
        return await middleware.handle(request, ctx, next);
      } catch (err) {
        if (ctx.sentry !== undefined) {
          ctx.sentry.captureException(err);
        }
        return next();
      }
    },
  };

  return wrapper;
}
