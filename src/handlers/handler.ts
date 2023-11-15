import { Env } from '../env';

/**
 * @param request Request object itself
 * @param env Worker env
 * @param ctx Execution context
 * @param cache Cache to use if applicable
 */
export type Handler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response>;
