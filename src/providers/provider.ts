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

  readDirectory(path: string): Promise<ReadDirectoryResult | undefined>;
}

/**
 * Headers returned by the http request made by the Provider to its data source.
 *  Can be be forwarded to the client.
 */
export type HttpResponseHeaders = {
  etag: string;
  'accept-range': string;
  'access-control-allow-origin'?: string;
  'cache-control': string;
  expires?: string;
  'last-modified': string;
  'content-encoding'?: string;
  'content-type'?: string;
  'content-language'?: string;
  'content-disposition'?: string;
  'content-length': string;
};

export type HeadFileResult = {
  /**
   * Headers to send the client
   */
  httpHeaders: HttpResponseHeaders;
};

export type GetFileOptions = {
  /**
   * R2 supports every conditional header except `If-Range`
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests#conditional_headers
   * @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations
   */
  conditionalHeaders?: {
    ifMatch?: string;
    ifNoneMatch?: string;
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
  };
  rangeHeader?: string;
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

export type R2ReadDirectoryResult = {
  subdirectories: string[];
  files: File[];
};

export type OriginReadDirectoryResult = {
  body: ReadableStream | null;
  /**
   * Status code to send the client
   */
  httpStatusCode: number;
  /**
   * Headers to send the client
   */
  httpHeaders: HttpResponseHeaders;
};

export type ReadDirectoryResult =
  | R2ReadDirectoryResult
  | OriginReadDirectoryResult;
