/**
 * Etags will have quotes removed from them
 * R2 supports every conditional header except `If-Range`
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests#conditional_headers
 * @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations
 */
export type ConditionalHeaders = {
  ifMatch?: string;
  ifNoneMatch?: string;
  ifModifiedSince?: Date;
  ifUnmodifiedSince?: Date;
  range?: R2Range;
};

/**
 * @param request Request object
 * @returns {@link URL} instance if url is valid, a 400
 *  response otherwise
 */
export function parseUrl(request: Request): URL | undefined {
  let url: URL | undefined;

  try {
    url = new URL(request.url);
  } catch (e) {
    console.error(e);
  }

  return url;
}

export function parseConditionalHeaders(headers: Headers): ConditionalHeaders {
  const ifModifiedSince = headers.has('if-modified-since')
    ? new Date(headers.get('if-modified-since')!)
    : undefined;
  if (ifModifiedSince !== undefined) {
    ifModifiedSince.setSeconds(ifModifiedSince.getSeconds() + 1);
  }

  return {
    ifMatch: headers.has('if-match')
      ? headers.get('if-match')!.replaceAll('"', '')
      : undefined,
    ifNoneMatch: headers.has('if-none-match')
      ? headers.get('if-none-match')!.replaceAll('"', '')
      : undefined,
    ifModifiedSince,
    ifUnmodifiedSince: headers.has('if-unmodified-since')
      ? new Date(headers.get('if-unmodified-since')!)
      : undefined,
    range: headers.has('range')
      ? parseRangeHeader(headers.get('range')!)
      : undefined,
  };
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 * @returns undefined if header is invalid
 */
export function parseRangeHeader(header: string): R2Range | undefined {
  // header: bytes=0-5
  const split = header.split('='); // ['bytes', '0-5']

  // Has no =, multiple =, or the unit isn't bytes
  if (split.length !== 2 || split[0] !== 'bytes') {
    return undefined;
  }

  let [, range] = split;

  const multipleRangeDelimiter = range.indexOf(',');
  if (multipleRangeDelimiter !== -1) {
    // Multiple ranges provided in the header (e.g. bytes=0-5, 10-15).
    //  R2 doesn't support this, so just go with the first
    range = range.substring(0, multipleRangeDelimiter);
  }

  const [start, end] = range.split('-'); // start=0, end=5

  // start will be the offset, end-start the length
  const startInt = parseInt(start);
  const endInt = parseInt(end);

  if (isNaN(startInt)) {
    if (isNaN(endInt)) {
      // bytes=-
      return undefined;
    }

    // bytes=-nnn
    return {
      suffix: endInt,
    };
  } else {
    if (isNaN(endInt)) {
      // bytes=nnn-
      return {
        offset: startInt,
      };
    }

    // bytes=nnn-nnn
    if (startInt >= endInt) {
      return undefined;
    }

    return {
      offset: startInt,
      length: endInt - startInt + 1, // +1 since it's inclusive
    };
  }
}
