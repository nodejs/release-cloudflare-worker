import {
  DIST_PATH_PREFIX,
  DOCS_PATH_PREFIX,
  DOWNLOAD_PATH_PREFIX,
  REDIRECT_MAP,
  URL_TO_BUCKET_PATH_MAP,
} from '../constants/r2Prefixes';
import { Env } from '../env';

/**
 * Maps a path in a url to the path to the resource
 *  in the R2 bucket
 * @param url Url to map
 * @param env Worker env
 * @returns Mapped path if the resource is accessible, undefined
 *  if the eyeball should not be trying to access the resource
 */
export function mapUrlPathToBucketPath(
  path: string,
  env: Pick<Env, 'DIRECTORY_LISTING'>
): string | undefined {
  const [, basePath, ...pathPieces] = path.split('/'); // 'docs', ['asd', '123']

  const mappedDist = `${DIST_PATH_PREFIX}/${pathPieces[0]}`;

  if (basePath === 'dist' && REDIRECT_MAP.has(mappedDist)) {
    // All items in REDIRECT_MAP are three levels deep, that is asserted in tests
    return `${REDIRECT_MAP.get(mappedDist)}/${pathPieces.slice(1).join('/')}`;
  }

  const mappedDocs = `${DOCS_PATH_PREFIX}/${pathPieces[0]}`;

  if (basePath === 'docs' && REDIRECT_MAP.has(mappedDocs)) {
    // All items in REDIRECT_MAP are three levels deep, that is asserted in tests
    return `${REDIRECT_MAP.get(mappedDocs)}/${pathPieces.slice(1).join('/')}`;
  }

  const mappedRelease = `${DIST_PATH_PREFIX}/${pathPieces[1]}`;

  if (pathPieces[0] === 'release' && REDIRECT_MAP.has(mappedRelease)) {
    return `${REDIRECT_MAP.get(mappedRelease)}/${pathPieces
      .slice(2)
      .join('/')}`;
  }

  if (basePath in URL_TO_BUCKET_PATH_MAP) {
    return URL_TO_BUCKET_PATH_MAP[basePath](path);
  }

  if (env.DIRECTORY_LISTING !== 'restricted') {
    return path.substring(1);
  }

  return undefined;
}

/**
 * Get all of the directories beginning with 'latest' in a
 *  directory
 * @param prefix Directory to look through
 */
function getAllLatestDirectories(prefix: string): Set<string> {
  const paths = new Set<string>();
  for (const [k] of REDIRECT_MAP) {
    if (k.startsWith(`${prefix}/latest`)) {
      paths.add(k.substring(prefix.length) + '/');
    }
  }
  return paths;
}

/**
 * Maps a path in the R2 bucket to the urls used to access it
 * @param bucketPath Path to map
 * @param env Worker env
 * @returns All possible url paths that lead to that resource,
 *  or undefined if it's inaccessible from a url path
 */
export function mapBucketPathToUrlPath(
  bucketPath: string,
  env: Pick<Env, 'DIRECTORY_LISTING'>
): string[] | undefined {
  // @TODO: Use a switch statement or a Design Pattern here
  if (bucketPath.startsWith(DIST_PATH_PREFIX)) {
    // Main release folder, accessible at `/dist/` or `/download/release/`
    const path = bucketPath.substring(DIST_PATH_PREFIX.length);

    const possibleUrlPaths = new Set<string>();

    // Purge directory listing of /dist/ and /download/release/
    possibleUrlPaths.add('/dist/');
    possibleUrlPaths.add('/download/release/');

    // Purge whatever the paths we're updating
    possibleUrlPaths.add(`/dist${path}`);
    possibleUrlPaths.add(`/download/release${path}`);

    // Purge all of the directory listings of folders starting with 'latest'
    //  (e.g. `/dist/latest-hydrogen`)
    // Bit of a hack, but I think this is the best we can do. The redirects
    //  we have in `src/constants/redirectLinks.json` will be out of date since
    //  a new version was uploaded and thus the latest has changed. We can't
    //  really determine the new latest here unless we run something
    //  similar to the `scripts/update-redirect-links.js` script here.
    const latestDirectories = getAllLatestDirectories('nodejs/release');

    for (const directory of latestDirectories) {
      possibleUrlPaths.add(`/dist${directory}`);
      possibleUrlPaths.add(`/download/release${directory}`);
    }

    return [...possibleUrlPaths];
  } else if (bucketPath.startsWith(DOCS_PATH_PREFIX)) {
    // Docs for main releases, accessible at `/docs/` or `/api/` for latest docs
    const path = bucketPath.substring(DOCS_PATH_PREFIX.length);

    const possibleUrlPaths = new Set<string>();

    // Purge directory listings for /docs/ and /download/docs/
    possibleUrlPaths.add('/docs/');
    possibleUrlPaths.add('/download/docs/');

    possibleUrlPaths.add(`/docs${path}`);
    possibleUrlPaths.add(`/download/docs${path}`);

    if (bucketPath.includes('/api')) {
      // Html file, purge it

      // /latest/api/assert.html
      let apiPath = path.substring(1); // latest/api/assert.html
      apiPath = apiPath.substring(apiPath.indexOf('/')); // /api/assert.html

      possibleUrlPaths.add(apiPath);
    }

    // Purge all of the directory listings of folders starting with 'latest'
    //  (e.g. `/docs/latest`)
    // Refer to previous call for explanation
    const latestDirectories = getAllLatestDirectories('nodejs/docs');

    for (const directory of latestDirectories) {
      possibleUrlPaths.add(`/docs${directory}`);
      possibleUrlPaths.add(`/download/docs${directory}`);
    }

    return [...possibleUrlPaths];
  } else if (bucketPath.startsWith(DOWNLOAD_PATH_PREFIX)) {
    // Rest of the `/download/...` paths (e.g. `/download/nightly/`)
    return [`/download${bucketPath.substring(DOWNLOAD_PATH_PREFIX.length)}`];
  } else if (bucketPath.startsWith('metrics')) {
    // Metrics doesn't need any redirects
    return ['/' + bucketPath];
  }

  return env.DIRECTORY_LISTING === 'restricted'
    ? undefined
    : ['/' + bucketPath];
}

export function hasTrailingSlash(path: string): boolean {
  return path[path.length - 1] === '/';
}

export function isExtensionless(path: string): boolean {
  // `path.lastIndexOf('.') == -1` is a Node-specific heuristic here.
  //  There aren't any files in the bucket that don't have file extensions,
  //  so, if there is no file extension specified in the url, treat it
  //  like a directory.
  //
  // Two exceptions:
  //  - `latest-vXX.x` directories
  //  - `vX.X.X` directories

  const finalSlashIndex = path.lastIndexOf('/');
  const extensionDelimiter = path.lastIndexOf('.');

  // extensionDelimiter is the index of the last `.`, we use it to tell
  //  whether or not there is a file extension. However, bucket paths such
  //  as `nodejs/release/v21.2.0/docs/api/` trip it up. So check if there's
  //  no extension OR if the extension comes before the final `/` and thus
  //  can't be a file extension
  if (extensionDelimiter === -1 || extensionDelimiter < finalSlashIndex) {
    return true;
  }

  const fileExtension = path.substring(extensionDelimiter + 1); // +1 to remove the `.`

  // This handles the two exceptions
  //  Either fileExtension === 'x' or we can parse it to a number successfully,
  //  since generally file extensions aren't numbers
  return /^([a-z]|\d+)$/i.test(fileExtension);
}

/**
 * Checks if a R2 path is for a directory or not.
 *  If a path ends in a `/` or there's no file
 *  extension, it's considered a directory path
 * @param path Path to check
 * @returns True if it's for a directory
 */
export function isDirectoryPath(path: string): boolean {
  return hasTrailingSlash(path) || isExtensionless(path);
}
