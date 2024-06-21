import type { ConditionalHeaders } from '../utils/request';

/**
 * A Provider is essentially an abstracted API client. This is the interface
 *  we interact with to head files, get files, and listing directories.
 */
export interface Provider {
  headFile(path: string): Promise<HeadFileResult | undefined>;

  getFile(
    path: string,
    options?: GetFileOptions
  ): Promise<GetFileResult | undefined>;

  readDirectory(
    path: string,
    options?: ReadDirectoryOptions
  ): Promise<ReadDirectoryResult | undefined>;
}

/**
 * Headers returned by the http request made by the Provider to its data source.
 *  Can be be forwarded to the client.
 */
export type HttpResponseHeaders = {
  etag: string;
  'accept-range': string;
  'access-control-allow-origin': string;
  'cache-control': string;
  expires: string;
  'last-modified': string;
  'content-encoding': string;
  'content-type': string;
  'content-language': string;
  'content-disposition': string;
  'content-length': string;
};

export type HeadFileResult = {
  /**
   * Status code to send the client
   */
  httpStatusCode: number;
  /**
   * Headers to send the client
   */
  httpHeaders: HttpResponseHeaders;
};

export type GetFileOptions = {
  conditionalHeaders?: ConditionalHeaders;
};
export type GetFileResult = {
  contents?: ReadableStream | null;
  /**
   * Status code to send the client
   */
  httpStatusCode: number;
  /**
   * Headers to send the client
   */
  httpHeaders: HttpResponseHeaders;
};

export type File = {
  name: string;
  lastModified: Date;
  size: number;
};

export type ReadDirectoryOptions = {
  listFiles: boolean;
};

export type ReadDirectoryResult = {
  subdirectories: string[];
  hasIndexHtmlFile: boolean;
  files: File[];
  /**
   * When a file in the directory was last modified, excluding subdirectories
   */
  lastModified: Date;
};
