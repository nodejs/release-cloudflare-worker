import {
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3';
import Handlebars from 'handlebars';
import { toReadableBytes } from '../../utils/object';
import { getFile } from './serveFile';

// Imports the Precompiled Handlebars Template
import htmlTemplate from '../../templates/directoryListing.out.js';
import { S3_MAX_KEYS, R2_RETRY_LIMIT } from '../../constants/limits';
import { CACHE_HEADERS } from '../../constants/cache';
import responses from '../../responses';
import { Context } from '../../context';

// Applies the Template into a Handlebars Template Function
const handleBarsTemplate = Handlebars.template(htmlTemplate);

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * @TODO: Simplify the iteration logic or make it more readable
 *
 * Renders the html for a directory listing response
 * @param url Parsed url of the request
 * @param request Request object itself
 * @param delimitedPrefixes Directories in the bucket
 * @param objects Objects in the bucket
 * @returns {@link Response} instance
 */
export function renderDirectoryListing(
  url: URL,
  request: Request,
  delimitedPrefixes: Set<string>,
  objects: _Object[]
): Response {
  // Holds the contents of the listing (directories and files)
  const tableElements: object[] = [];

  const urlPathname = `${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}`;

  // Renders all the subdirectories within the Directory
  delimitedPrefixes.forEach(name => {
    const extra = encodeURIComponent(name.substring(0, name.length - 1));

    let displayName: string;
    let displayNamePaddingRight: string = ''; // hate this
    if (name.length > 50) {
      displayName = name.substring(0, 49) + '>';
    } else {
      displayName = name;
      displayNamePaddingRight = ' '.repeat(50 - name.length);
    }

    tableElements.push({
      href: `${extra}/`,
      displayNamePaddingRight,
      name: displayName,
      lastModified: '               -',
      size: '                  -',
    });
  });

  // Last time any of the files within the directory got modified
  let directoryLastModified: Date | undefined = undefined;

  // Renders all the Files within the Directory
  objects.forEach(object => {
    const name = object.Key;

    // Find the most recent date a file in this
    //  directory was modified, we'll use it
    //  in the `Last-Modified` header
    if (
      directoryLastModified === undefined ||
      object.LastModified! > directoryLastModified
    ) {
      directoryLastModified = object.LastModified!;
    }

    const lastModified = object.LastModified!;
    const dateStr = `${lastModified.getUTCDay()}-${months.at(
      lastModified.getUTCMonth()
    )}-${lastModified.getUTCFullYear()} ${lastModified.getUTCHours()}:${lastModified.getUTCMinutes()}`;

    let displayName: string = '';
    let displayNamePaddingRight: string = ''; // hate this
    if (name!.length > 50) {
      displayName = name!.substring(0, 47) + '..>';
    } else {
      displayName = name!;
      displayNamePaddingRight = ' '.repeat(50 - name!.length);
    }

    const bytes = toReadableBytes(object.Size!);

    tableElements.push({
      href: `${urlPathname}${encodeURIComponent(name ?? '')}`,
      name: displayName,
      displayNamePaddingRight,
      lastModified: dateStr,
      size: ' '.repeat(20 - bytes.length) + bytes,
    });
  });

  // Renders the Handlebars Template with the populated data
  const renderedListing = handleBarsTemplate({
    pathname: url.pathname,
    entries: tableElements,
  });

  // Gets an UTC-string on the ISO-8901 format of last modified date
  const directoryLastModifiedUtc = (
    directoryLastModified ?? new Date()
  ).toUTCString();

  return new Response(request.method === 'GET' ? renderedListing : null, {
    headers: {
      'last-modified': directoryLastModifiedUtc,
      'content-type': 'text/html',
      'cache-control': CACHE_HEADERS.success,
    },
  });
}

/**
 * Send a request to R2 to get the objects & paths in a directory
 * @param client {@link S3Client} to use for the request
 * @param bucketPath Path in R2 bucket
 * @param cursor Where to begin the request from, for pagination
 * @param env Worker env
 * @returns A {@link ListObjectsV2CommandOutput}
 * @throws When all retries are exhausted and no response was returned
 */
async function fetchR2Result(
  url: URL,
  client: S3Client,
  bucketPath: string,
  cursor: string | undefined,
  ctx: Context
): Promise<ListObjectsV2CommandOutput | Response> {
  let r2Error: unknown = undefined;
  for (let i = 0; i < R2_RETRY_LIMIT; i++) {
    try {
      // Send request to R2
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: ctx.env.BUCKET_NAME,
          Prefix: bucketPath,
          Delimiter: '/',
          MaxKeys: S3_MAX_KEYS,
          ContinuationToken: cursor,
        })
      );

      // Request succeeded, no need for any retries
      return result;
    } catch (err) {
      // Got an error, let's log it and retry
      console.error(`R2 ListObjectsV2 error: ${err}`);

      r2Error = err;
    }
  }

  // R2 isn't having a good day, log to sentry & rewrite to direct.nodejs.org
  const error = new Error(`R2 failed listing path ${bucketPath}: ${r2Error}`);
  if (ctx.env.USE_FALLBACK_WHEN_R2_FAILS) {
    ctx.sentry.captureException(error);
    const res = await fetch(ctx.env.FALLBACK_HOST + url.pathname, {
      method: 'GET',
    });
    return res;
  } else {
    // Return 500
    throw error;
  }
}

/**
 * Directory listing
 * @param url Parsed url of the request
 * @param request Request object itself
 * @param bucketPath Path in R2 bucket
 * @param env Worker env
 */
export async function listDirectory(
  url: URL,
  request: Request,
  bucketPath: string,
  ctx: Context
): Promise<Response> {
  const delimitedPrefixes = new Set<string>();
  const objects: _Object[] = []; // s3 sdk types are weird

  // Create an S3 client instance to interact with the bucket.
  // There is a limit in the size of the response that
  //  a binding can return. We kept hitting it due to the
  //  size of our paths, causing us to send a lot of requests
  //  to R2 which in turn added a lot of latency. The S3 api
  //  doesn't have that response body size constraint so we're
  //  using it for now.
  const client = new S3Client({
    region: 'auto',
    endpoint: ctx.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: ctx.env.S3_ACCESS_KEY_ID,
      secretAccessKey: ctx.env.S3_ACCESS_KEY_SECRET,
    },
  });

  let truncated = true;
  let cursor: string | undefined;

  while (truncated) {
    const result: ListObjectsV2CommandOutput | Response = await fetchR2Result(
      url,
      client,
      bucketPath,
      cursor,
      ctx
    );

    // Fell back to direct.nodejs.org, return the response
    if (result instanceof Response) {
      return result;
    }

    // R2 sends us back the absolute path of the object, cut it
    result.CommonPrefixes?.forEach(path => {
      if (path.Prefix !== undefined)
        delimitedPrefixes.add(path.Prefix.substring(bucketPath.length));
    });

    const hasIndexFile = result.Contents
      ? result.Contents.some(object => object.Key?.endsWith('index.html'))
      : false;

    if (hasIndexFile) {
      return getFile(url, request, `${bucketPath}index.html`, ctx);
    }

    // R2 sends us back the absolute path of the object, cut it
    result.Contents?.forEach(object =>
      objects.push({
        ...object,
        Key: object.Key?.substring(bucketPath.length),
      })
    );

    // Default this to false just so we don't end up in a never ending
    //  loop if they don't send this back for whatever reason
    truncated = result.IsTruncated ?? false;
    cursor = truncated ? result.NextContinuationToken : undefined;
  }

  // Directory needs either subdirectories or files in it cannot be empty
  if (delimitedPrefixes.size === 0 && objects.length === 0) {
    return responses.directoryNotFound(request);
  }

  if (request.method === 'HEAD') {
    return new Response(undefined, { status: 200 });
  }

  return renderDirectoryListing(url, request, delimitedPrefixes, objects);
}
