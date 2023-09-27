import Handlebars from 'handlebars';
import { Env } from '../../env';
import responses from '../../responses';
import { niceBytes } from '../../util';
import { getFile } from './serveFile';

// Imports the Precompiled Handlebars Template
import htmlTemplate from '../../templates/directoryListing.out.js';

// Applies the Template into a Handlebars Template Function
const handleBarsTemplate = Handlebars.template(htmlTemplate);

type DirectoryListingEntry = {
  href: string;
  name: string;
  lastModified: string;
  size: string;
};

/**
 * Renders the html for a single listing entry
 * @param href Absolute path to the file or directory
 * @param name Name of the file or directory
 * @param lastModified Last modified UTC timestamp, omit if directory
 * @param size Size of the file, omit if directory
 * @returns Rendered html
 */
function getTableEntry(
  href: string,
  name: string,
  lastModified: string = '-',
  size: string = '-'
): DirectoryListingEntry {
  return {
    href,
    name,
    lastModified,
    size,
  };
}

type DirectoryListingResponse = {
  html: string;
  lastModified: string;
};

/**
 * @TODO: Simplify the iteration logic or make it more readable
 *
 * Renders the html for a directory listing response
 * @param url Parsed url of the request
 * @param bucketPath Path in R2 bucket
 * @param delimitedPrefixes Directories in the bucket
 * @param listingResponse Listing response to render
 * @returns {@link DirectoryListingResponse} instance
 */
function renderDirectoryListing(
  url: URL,
  bucketPath: string,
  delimitedPrefixes: Set<string>,
  objects: R2Object[]
): DirectoryListingResponse {
  // Holds all the html for each directory and file
  //  we're listing
  const tableElements = new Array<DirectoryListingEntry>();

  tableElements.push(getTableEntry('../', '../'));

  const urlPathname = url.pathname.endsWith('/')
    ? url.pathname
    : `${url.pathname}/`;

  // Render directories first
  for (const directory of delimitedPrefixes) {
    // R2 sends us back the absolute path of the directory, cut it
    const name = directory.substring(bucketPath.length);

    const tableEntry = getTableEntry(
      `${urlPathname}${encodeURIComponent(
        name.substring(0, name.length - 1)
      )}/`,
      name
    );

    tableElements.push(tableEntry);
  }

  // Render files second
  let lastModified: Date | undefined = undefined;

  for (const object of objects) {
    // R2 sends us back the absolute path of the object, cut it
    const name = object.key.substring(bucketPath.length);

    // Find the most recent date a file in this
    //  directory was modified, we'll use it
    //  in the `Last-Modified` header
    if (lastModified === undefined || object.uploaded > lastModified) {
      lastModified = object.uploaded;
    }

    let dateStr = object.uploaded.toISOString();

    dateStr = dateStr.split('.')[0].replace('T', ' ');
    dateStr = dateStr.slice(0, dateStr.lastIndexOf(':')) + 'Z';

    const tableEntry = getTableEntry(
      `${urlPathname}${encodeURIComponent(name)}`,
      name,
      dateStr,
      niceBytes(object.size)
    );

    tableElements.push(tableEntry);
  }

  return {
    html: handleBarsTemplate({
      pathname: url.pathname,
      entries: tableElements,
    }),
    lastModified: (lastModified ?? new Date()).toUTCString(),
  };
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
  if (!bucketPath.endsWith('/')) {
    bucketPath += '/';
  }

  const delimitedPrefixes = new Set<string>();
  const objects = new Array<R2Object>();
  let truncated = true;
  let cursor: string | undefined;

  while (truncated) {
    const result = await env.R2_BUCKET.list({
      prefix: bucketPath,
      delimiter: '/',
      cursor,
    });

    result.delimitedPrefixes.forEach(prefix => delimitedPrefixes.add(prefix));

    for (const object of result.objects) {
      // Check if there's an index file and use it if there is
      if (object.key.endsWith('index.html')) {
        return getFile(url, request, bucketPath + 'index.html', env);
      }

      objects.push(object);
    }

    truncated = result.truncated;
    cursor = result.truncated ? result.cursor : undefined;
  }

  // Directory needs either subdirectories or files in it,
  //  cannot be empty
  if (delimitedPrefixes.size === 0 && objects.length === 0) {
    return responses.DIRECTORY_NOT_FOUND(request);
  }

  const response = renderDirectoryListing(
    url,
    bucketPath,
    delimitedPrefixes,
    objects
  );

  return new Response(request.method === 'GET' ? response.html : null, {
    headers: {
      'last-modified': response.lastModified,
      'content-type': 'text/html',
      'cache-control': env.DIRECTORY_CACHE_CONTROL || 'no-store',
    },
  });
}
