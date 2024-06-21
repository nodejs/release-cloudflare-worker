import type { IRequest } from 'itty-router';

export interface Request extends IRequest {
  urlObj: URL;

  /**
   * Set by {@link SubtitutionMiddleware} if it's used
   */
  unsubtitutedUrl?: URL;
}
