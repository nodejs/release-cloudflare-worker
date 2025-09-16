import { Env } from './src/env';
import { Directory } from './vitest-setup';

declare module 'vitest' {
  export interface ProvidedContext {
    devBucket: Directory;
  }
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
