import { CACHE_HEADERS } from '../constants/cache';
import { Env } from '../env';

export default (error: unknown, env: Pick<Env, 'ENVIRONMENT'>): Response => {
  let responseBody = 'Internal Server Error';

  if (
    (env.ENVIRONMENT === 'dev' || env.ENVIRONMENT === 'e2e-tests') &&
    error instanceof Error
  ) {
    responseBody += `\nMessage: ${error.message}\nStack trace: ${error.stack}`;
  }

  return new Response(responseBody, {
    status: 500,
    headers: { 'cache-control': CACHE_HEADERS.failure },
  });
};
