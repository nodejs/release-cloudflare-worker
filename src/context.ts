import type { Toucan } from 'toucan-js';
import type { Env } from './env';

export interface Context {
  env: Env;
  execution: ExecutionContext;
  sentry?: Toucan;
}
