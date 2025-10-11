import { parseHttpDate } from './http-date';

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

export function parseConditionalHeaders(headers: Headers): ConditionalHeaders {
  const ifModifiedSince = parseHttpDate(headers.get('if-modified-since'));

  const ifMatch = headers.has('if-match')
    ? headers.get('if-match')!.replaceAll('"', '')
    : undefined;

  const ifNoneMatch = headers.has('if-none-match')
    ? headers.get('if-none-match')!.replaceAll('"', '')
    : undefined;

  const ifUnmodifiedSince = parseHttpDate(headers.get('if-unmodified-since'));

  const range = headers.has('range')
    ? parseRangeHeader(headers.get('range')!)
    : undefined;

  return {
    ifMatch,
    ifNoneMatch,
    ifModifiedSince,
    ifUnmodifiedSince,
    range,
  };
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 * @returns undefined if header is invalid
 */
export function parseRangeHeader(header: string): R2Range | undefined {
  // header = 'bytes=0-5'
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

  // start will be the offset, end-start is the length
  const startInt = parseInt(start);
  const endInt = parseInt(end);

  if (isNaN(startInt)) {
    // startInt isn't a number, meaning we're only supposed to get the index to
    //  cut off at (aka the suffix index).

    if (isNaN(endInt)) {
      // We weren't given the number to cut off at, this is just an invalid header
      //  e.g. `bytes=-` or `bytes=asd-foo`
      return undefined;
    }

    // bytes=-123
    return { suffix: endInt };
  } else {
    // startInt is a number, meaning we're given an offset to start at.

    if (isNaN(endInt)) {
      // We were just given a offset, client wants everything at and after the
      //  offset. e.g. `bytes=nnn-`, this also would include `bytes=123-foo`
      //  though.
      return { offset: startInt };
    }

    // At this point, we know we were given a starting offset and a cut off
    //  point, e.g. `bytes=123-456`

    if (startInt >= endInt) {
      // Ending before we started, invalid
      return undefined;
    }

    return {
      offset: startInt,
      length: endInt - startInt + 1, // +1 since it's inclusive
    };
  }
}
