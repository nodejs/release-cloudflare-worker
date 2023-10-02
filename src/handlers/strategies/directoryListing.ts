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
 * @param listingResponse Listing response to render
 * @returns {@link DirectoryListingResponse} instance
 */
export function renderDirectoryListing(
  url: URL,
  request: Request,
  delimitedPrefixes: Set<string>,
  objects: R2Object[],
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
    const name = object.key;

    // Find the most recent date a file in this
    //  directory was modified, we'll use it
    //  in the `Last-Modified` header
    if (lastModified === undefined || object.uploaded > lastModified) {
      lastModified = object.uploaded;
    }

    let dateStr = object.uploaded.toISOString();

    dateStr = dateStr.split('.')[0].replace('T', ' ');
    dateStr = dateStr.slice(0, dateStr.lastIndexOf(':')) + 'Z';

    tableElements.push({
      href: `${urlPathname}${encodeURIComponent(name)}`,
      name,
      lastModified: dateStr,
      size: niceBytes(object.size),
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
  const objects: R2Object[] = [];

  let truncated = true;
  let cursor: string | undefined;

  while (truncated) {
    const result = await env.R2_BUCKET.list({
      prefix: bucketPath,
      delimiter: '/',
      cursor,
    });

    // R2 sends us back the absolute path of the object, cut it
    result.delimitedPrefixes.forEach(prefix =>
      delimitedPrefixes.add(prefix.substring(bucketPath.length))
    );

    const hasIndexFile = result.objects.find(object =>
      object.key.endsWith('index.html')
    );

    if (hasIndexFile !== undefined && hasIndexFile !== null) {
      return getFile(url, request, `${bucketPath}index.html`, env);
    }

    // R2 sends us back the absolute path of the object, cut it
    result.objects.forEach(object =>
      objects.push({
        ...object,
        key: object.key.substring(bucketPath.length),
      } as R2Object)
    );

    truncated = result.truncated;
    cursor = result.truncated ? result.cursor : undefined;
  }

  // Directory needs either subdirectories or files in it cannot be empty
  if (delimitedPrefixes.size === 0 && objects.length === 0) {
    return responses.DIRECTORY_NOT_FOUND(request);
  }

  return renderDirectoryListing(url, request, delimitedPrefixes, objects, env);
}
