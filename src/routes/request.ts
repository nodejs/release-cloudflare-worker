import { IRequest } from 'itty-router';

export interface Request extends IRequest {
  urlObj: URL;
}
