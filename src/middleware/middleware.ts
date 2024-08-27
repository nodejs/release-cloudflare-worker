import type { Context } from '../context';
import type { Request } from '../routes/request';

export type MiddlewareNext = () => Promise<Response>;

export interface Middleware {
  /**
   * Handle an incoming request
   * @param next Calls the next middleware in the chain. This may also call
   *  other middlewares before returning.
   */
  handle(
    request: Request,
    ctx: Context,
    next: MiddlewareNext
  ): Promise<Response>;
}
