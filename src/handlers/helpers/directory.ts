import { Env } from '../../env';
import responses from '../../responses';
import { niceBytes } from '../../util';

/**
 * Renders the html for a single listing entry
 * @param href Absolute path to the file or directory
 * @param name Name of the file or directory
 * @param lastModified Last modified UTC timestamp, omit if directory
 * @param size Size of the file, omit if directory
 * @returns Rendered html
 */
function renderTableElement(
  href: string,
  name: string,
  lastModified: string = '-',
  size: string = '-'
): string {
  return `<tr>
      <td><a href="${href}">${name}</a></td>
      <td>${lastModified}</td>
      <td>${size}</td>
    </tr>`;
}

type DirectoryListingResponse = {
  html: string;
  lastModified: string;
};

/**
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
  const tableElements = new Array<string>();
  tableElements.push(renderTableElement('../', '../'));

  const urlPathname = url.pathname.endsWith('/')
    ? url.pathname
    : `${url.pathname}/`;

  // Render directories first
  for (const directory of delimitedPrefixes) {
    // R2 sends us back the absolute path of the directory, cut it
    const name = directory.substring(bucketPath.length);
    const elementHtml = renderTableElement(
      `${urlPathname}${encodeURIComponent(
        name.substring(0, name.length - 1)
      )}/`,
      name
    );
    tableElements.push(elementHtml);
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

    const elementHtml = renderTableElement(
      `${urlPathname}${encodeURIComponent(name)}`,
      name,
      dateStr,
      niceBytes(object.size)
    );
    tableElements.push(elementHtml);
  }

  return {
    html: `<!DOCTYPE html>
      <html>
        <head>
          <title>Index of ${url.pathname}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta charset="utf-8">
          <style type="text/css">
            td { padding-right: 16px; text-align: right; font-family: monospace }
            td:nth-of-type(1) { text-align: left; overflow-wrap: anywhere }
            td:nth-of-type(3) { white-space: nowrap }
            th { text-align: left; }
            @media (prefers-color-scheme: dark) {
              body {
                color: white;
                background-color: #1c1b22;
              }
              a {
                color: #3391ff;
              }
              a:visited {
                color: #C63B65;
              }
            }
          </style>
        </head>
        <body>
          <h1>Index of ${url.pathname}</h1>
          <table>
            <tr><th>Filename</th><th>Modified</th><th>Size</th></tr>
            ${tableElements.join('\n')}
          </table>
        </body>
      </html>`,
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
    objects.push(...result.objects);
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
