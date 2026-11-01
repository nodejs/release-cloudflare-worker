import { Directory } from './vitest-setup';

declare module 'vitest' {
  export interface ProvidedContext {
    devBucket: Directory;
  }
}
