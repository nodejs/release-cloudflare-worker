import { Context } from '../context';

/**
 * @param request Request object itself
 * @param ctx Worker context
 * @param cache Cache to use if applicable
 */
export type Handler = (request: Request, ctx: Context) => Promise<Response>;
