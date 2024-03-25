import { Toucan } from 'toucan-js';
import { Env } from './env';

export interface Context {
  env: Env;
  execution: ExecutionContext;
  sentry: Toucan;
}
