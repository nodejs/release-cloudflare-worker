import * as Sentry from '@sentry/cloudflare';
import { IttyRouter, type RequestHandler } from 'itty-router';
import type { Request as WorkerRequest } from './request';
import type { Context } from '../context';
import responses from '../responses';
import type { Middleware } from '../middleware/middleware';

type IttyRouterArgs = [Context, URL | undefined];
type WorkerRequestHandler = RequestHandler<WorkerRequest, IttyRouterArgs>;

/**
 * Middleware that's placed at the end of a route's middleware chain so we can
 * know if a request was unhandled by all the middleware in front of this one
 */
const finalMiddleware: WorkerRequestHandler = () => {
  throw new Error('reached the end of middleware');
};

/**
 * Simple wrapper around {@link IttyRouter} that allows us to do some better
 * error handling.
 */
export class Router {
  #itty = IttyRouter<WorkerRequest, IttyRouterArgs, Response>();

  fetch(
    request: Request,
    ctx: Context,
    unsubstitutedUrl?: URL
  ): Promise<Response> {
    return this.#itty.fetch(request, ctx, unsubstitutedUrl);
  }

  all(path: string, ...middlewares: Middleware[]): void {
    this.#itty.all(
      path,
      ...middlewares.map(middlewareToRoute),
      finalMiddleware
    );
  }

  options(path: string, ...middlewares: Middleware[]): void {
    this.#itty.options(
      path,
      ...middlewares.map(middlewareToRoute),
      finalMiddleware
    );
  }

  head(path: string, ...middlewares: Middleware[]): void {
    this.#itty.head(
      path,
      ...middlewares.map(middlewareToRoute),
      finalMiddleware
    );
  }

  get(path: string, ...middlewares: Middleware[]): void {
    this.#itty.get(
      path,
      ...middlewares.map(middlewareToRoute),
      finalMiddleware
    );
  }

  post(path: string, ...middlewares: Middleware[]): void {
    this.#itty.post(
      path,
      ...middlewares.map(middlewareToRoute),
      finalMiddleware
    );
  }
}

/**
 * Wraps a {@link Middleware} in a {@link WorkerRequestHandler}, defines
 * properties on the request that are specific to us, and adds error handling
 * to gracefully take care of any errors that happen.
 *
 * If an error does occur, we report it to Sentry and move onto the middleware
 * after this one. If that middleware is the {@link finalMiddleware}, another
 * error is thrown up to the scope that the router's {@link Router#fetch} was
 * called.
 */
function middlewareToRoute(middleware: Middleware): WorkerRequestHandler {
  return async (req, ctx, unsubstitutedUrl) => {
    if (req.urlObj === undefined) {
      const url = URL.parse(req.url);
      if (!url) {
        return responses.badRequest();
      }

      req.urlObj = url;
    }

    if (unsubstitutedUrl && req.unsubstitutedUrl === undefined) {
      req.unsubstitutedUrl = unsubstitutedUrl;
    }

    try {
      const response = await middleware.handle(req, ctx);

      return response;
    } catch (err) {
      // Catch the exception, report to Sentry
      Sentry.captureException(err);

      // Don't return anything so itty router will continue to next route in
      // the chain
    }
  };
}
