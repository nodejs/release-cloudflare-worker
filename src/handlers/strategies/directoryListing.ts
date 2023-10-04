import { ListObjectsV2Command, S3Client, _Object } from '@aws-sdk/client-s3';
import Handlebars from 'handlebars';
import { Env } from '../../env';
import responses from '../../commonResponses';
import { niceBytes } from '../../util';
import { getFile } from './serveFile';

// Imports the Precompiled Handlebars Template
import htmlTemplate from '../../templates/directoryListing.out.js';

// Applies the Template into a Handlebars Template Function
const handleBarsTemplate = Handlebars.template(htmlTemplate);

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
  objects: _Object[],
  env: Env
): Response {
  // Holds all the html for each directory and file we're listing
  const tableElements = [];

  // Add the default parent directory listing
  tableElements.push({
    href: '../',
    name: '../',
    lastModified: '-',
    size: '-',
  });

  const urlPathname = `${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}`;

  // Renders all the subdirectories within the Directory
  delimitedPrefixes.forEach(name => {
    const extra = encodeURIComponent(name.substring(0, name.length - 1));

    tableElements.push({
      href: `${urlPathname}${extra}/`,
      name,
      lastModified: '-',
      size: '-',
    });
  });

  // Last time any of the files within the directory got modified
  let lastModified: Date | undefined = undefined;

  // Renders all the Files within the Directory
  objects.forEach(object => {
    const name = object.Key;

    // Find the most recent date a file in this
    //  directory was modified, we'll use it
    //  in the `Last-Modified` header
    if (lastModified === undefined || object.LastModified! > lastModified) {
      lastModified = object.LastModified!;
    }

    let dateStr = object.LastModified!.toISOString();

    dateStr = dateStr.split('.')[0].replace('T', ' ');
    dateStr = dateStr.slice(0, dateStr.lastIndexOf(':')) + 'Z';

    tableElements.push({
      href: `${urlPathname}${encodeURIComponent(name ?? "")}`,
      name,
      lastModified: dateStr,
      size: niceBytes(object.Size!),
    });
  });

  // Renders the Handlebars Template with the populated data
  const renderedListing = handleBarsTemplate({
    pathname: url.pathname,
    entries: tableElements,
  });

  // Gets an UTC-string on the ISO-8901 format of last modified date
  const lastModifiedUTC = (lastModified ?? new Date()).toUTCString();

  return new Response(request.method === 'GET' ? renderedListing : null, {
    headers: {
      'last-modified': lastModifiedUTC,
      'content-type': 'text/html',
      'cache-control': env.DIRECTORY_CACHE_CONTROL || 'no-store',
    },
  });
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
  env: Env
): Promise<Response> {
  const delimitedPrefixes = new Set<string>();
  const objects: _Object[] = []; // s3 sdk types are weird

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_ACCESS_KEY_SECRET,
    }
  });

  let truncated = true;
  let cursor: string | undefined;

  let r2Hits = 0;
  console.log(`r2:`)
  while (truncated) {
    const start = performance.now();
    const result = await client.send(new ListObjectsV2Command({
      Bucket: env.BUCKET_NAME,
      Prefix: bucketPath,
      Delimiter: '/',
      MaxKeys: 1000,
      ContinuationToken: cursor
    })).catch(err => {
      console.log(err);
      throw err;
    });
    r2Hits++;
    console.log(` hit ${r2Hits}: ${performance.now()-start}ms, ${result.Contents?.length ?? 0} objects, ${result.CommonPrefixes?.length ?? 0} directories`);

    // R2 sends us back the absolute path of the object, cut it
    result.CommonPrefixes?.forEach(path => {
      if (path.Prefix !== undefined) delimitedPrefixes.add(path.Prefix.substring(bucketPath.length))
    });

    const hasIndexFile = result.Contents?.find(object => object.Key?.endsWith('index.html'));

    if (hasIndexFile !== undefined && hasIndexFile !== null) {
      return getFile(url, request, `${bucketPath}index.html`, env);
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
    return responses.DIRECTORY_NOT_FOUND(request);
  }

  return renderDirectoryListing(url, request, delimitedPrefixes, objects, env);
}
