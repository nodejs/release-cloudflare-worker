import type { Env } from './env';

export interface Context {
  env: Env;
  execution: ExecutionContext;
}
